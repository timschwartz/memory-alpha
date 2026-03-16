import { EventEmitter } from 'node:events';
import { createWriteStream, existsSync } from 'node:fs';
import { unlink, stat } from 'node:fs/promises';
import { Worker } from 'node:worker_threads';
import path from 'node:path';
import type {
  DownloadStatus,
  DownloadProgressEvent,
  DownloadCompleteEvent,
} from '@memory-alpha/shared';

const DOWNLOAD_URL =
  'https://s3.amazonaws.com/wikia_xml_dumps/e/en/enmemoryalpha_pages_current.xml.7z';
const ARCHIVE_FILENAME = 'enmemoryalpha_pages_current.xml.7z';
const EXPECTED_XML = 'enmemoryalpha_pages_current.xml';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export class DownloadManager extends EventEmitter {
  private status: DownloadStatus = {
    state: 'idle',
    phase: null,
    percent: null,
    downloadedBytes: null,
    totalBytes: null,
    error: null,
    startedAt: null,
    completedAt: null,
  };

  private abortController: AbortController | null = null;
  private worker: Worker | null = null;
  private dataDir: string;

  constructor(dataDir: string) {
    super();
    this.dataDir = dataDir;
  }

  getDataDir(): string {
    return this.dataDir;
  }

  getStatus(): DownloadStatus {
    return { ...this.status };
  }

  isActive(): boolean {
    return this.status.state === 'downloading' || this.status.state === 'decompressing';
  }

  async start(): Promise<void> {
    if (this.isActive()) {
      throw new Error('A download is already in progress');
    }

    this.reset();
    this.status.state = 'downloading';
    this.status.phase = 'download';
    this.status.startedAt = new Date().toISOString();

    const archivePath = path.join(this.dataDir, ARCHIVE_FILENAME);

    try {
      await this.download(archivePath);
      await this.decompress(archivePath);
      await this.cleanup(archivePath);

      this.status.state = 'complete';
      this.status.phase = null;
      this.status.completedAt = new Date().toISOString();

      const xmlPath = path.join(this.dataDir, EXPECTED_XML);
      const stats = await stat(xmlPath);

      const completeEvent: DownloadCompleteEvent = {
        filename: EXPECTED_XML,
        sizeBytes: stats.size,
        sizeHuman: formatBytes(stats.size),
      };
      this.emit('complete', completeEvent);
    } catch (err) {
      if ((this.status as DownloadStatus).state === 'cancelled') {
        this.emit('cancelled', {});
        await this.cleanupPartialFiles(archivePath);
      } else {
        const message = err instanceof Error ? err.message : 'Unknown error';
        this.status.state = 'failed';
        this.status.error = message;
        this.emit('error', { message });
        await this.cleanupPartialFiles(archivePath);
      }
    }
  }

  async cancel(): Promise<void> {
    if (!this.isActive()) {
      throw new Error('No download or decompression operation is in progress');
    }

    this.status.state = 'cancelled';
    this.status.phase = null;

    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }

    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }
  }

  private reset(): void {
    this.status = {
      state: 'idle',
      phase: null,
      percent: null,
      downloadedBytes: null,
      totalBytes: null,
      error: null,
      startedAt: null,
      completedAt: null,
    };
    this.abortController = null;
    this.worker = null;
  }

  private async download(archivePath: string): Promise<void> {
    this.abortController = new AbortController();

    const response = await fetch(DOWNLOAD_URL, { signal: this.abortController.signal });

    if (!response.ok) {
      throw new Error(`Download failed: HTTP ${response.status}`);
    }

    const contentLength = Number(response.headers.get('content-length'));
    this.status.totalBytes = contentLength || null;

    const reader = response.body!.getReader();
    const fileStream = createWriteStream(archivePath);
    let downloaded = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        downloaded += value.length;
        this.status.downloadedBytes = downloaded;

        if (contentLength > 0) {
          this.status.percent = Math.round((downloaded / contentLength) * 1000) / 10;
        }

        const progressEvent: DownloadProgressEvent = {
          state: 'downloading',
          phase: 'download',
          percent: this.status.percent,
          downloadedBytes: downloaded,
          totalBytes: this.status.totalBytes,
        };
        this.emit('progress', progressEvent);

        fileStream.write(value);
      }
    } finally {
      fileStream.end();
      await new Promise<void>((resolve, reject) => {
        fileStream.on('finish', resolve);
        fileStream.on('error', reject);
      });
      this.abortController = null;
    }
  }

  private async decompress(archivePath: string): Promise<void> {
    this.status.state = 'decompressing';
    this.status.phase = 'decompress';
    this.status.percent = null;
    this.status.downloadedBytes = null;
    this.status.totalBytes = null;

    const progressEvent: DownloadProgressEvent = {
      state: 'decompressing',
      phase: 'decompress',
      percent: null,
      downloadedBytes: null,
      totalBytes: null,
    };
    this.emit('progress', progressEvent);

    return new Promise<void>((resolve, reject) => {
      const workerPath = new URL('./decompress-worker.js', import.meta.url).pathname;
      this.worker = new Worker(workerPath, {
        workerData: { archivePath, outputDir: this.dataDir },
      });

      this.worker.on('message', (msg: { type: string; percent?: number }) => {
        if (msg.type === 'progress') {
          this.status.percent = msg.percent ?? null;
          const event: DownloadProgressEvent = {
            state: 'decompressing',
            phase: 'decompress',
            percent: msg.percent ?? null,
            downloadedBytes: null,
            totalBytes: null,
          };
          this.emit('progress', event);
        } else if (msg.type === 'done') {
          this.worker = null;
          resolve();
        }
      });

      this.worker.on('error', (err) => {
        this.worker = null;
        reject(err);
      });

      this.worker.on('exit', (code) => {
        this.worker = null;
        if (code !== 0 && this.status.state !== 'cancelled') {
          reject(new Error(`Decompression worker exited with code ${code}`));
        }
      });
    });
  }

  private async cleanup(archivePath: string): Promise<void> {
    if (existsSync(archivePath)) {
      await unlink(archivePath);
    }
  }

  private async cleanupPartialFiles(archivePath: string): Promise<void> {
    try {
      if (existsSync(archivePath)) {
        await unlink(archivePath);
      }
    } catch {
      // Best effort cleanup
    }
  }
}
