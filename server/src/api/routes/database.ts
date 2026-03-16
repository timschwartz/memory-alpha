import { Router } from 'express';
import type { Request, Response } from 'express';
import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import type { ApiResponse, XmlFileInfo, ImportProgressSSEEvent, ImportCompleteSSEEvent, ImportErrorSSEEvent } from '@memory-alpha/shared';
import type { DownloadManager } from '../../lib/download-manager.js';
import { MediaWikiImporter } from '../../lib/importer.js';

const MEMORY_ALPHA_FILENAME = 'enmemoryalpha_pages_current.xml';
const FRESHNESS_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export function createDatabaseRouter(downloadManager: DownloadManager, databasePath: string): Router {
  const router = Router();

  // SSE clients for broadcasting events
  const sseClients = new Set<Response>();

  // Forward DownloadManager events to all SSE clients
  function broadcastSSE(event: string, data: unknown) {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const client of sseClients) {
      client.write(payload);
    }
  }

  downloadManager.on('progress', (data) => broadcastSSE('progress', data));
  downloadManager.on('complete', (data) => broadcastSSE('complete', data));
  downloadManager.on('error', (data) => broadcastSSE('error', data));
  downloadManager.on('cancelled', (data) => broadcastSSE('cancelled', data));

  // GET /api/database/events — SSE stream
  router.get('/events', (_req: Request, res: Response) => {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });
    res.write('\n');

    sseClients.add(res);

    _req.on('close', () => {
      sseClients.delete(res);
    });
  });

  // GET /api/database/status
  router.get('/status', (_req: Request, res: Response) => {
    const body: ApiResponse<ReturnType<DownloadManager['getStatus']>> = {
      data: downloadManager.getStatus(),
      meta: null,
      error: null,
    };
    res.json(body);
  });

  // POST /api/database/download
  router.post('/download', (_req: Request, res: Response) => {
    if (downloadManager.isActive()) {
      const body: ApiResponse<null> = {
        data: null,
        meta: null,
        error: { code: 'DOWNLOAD_IN_PROGRESS', message: 'A download is already in progress' },
      };
      res.status(409).json(body);
      return;
    }

    // Fire and forget — progress is streamed via SSE
    downloadManager.start().catch(() => {
      // Errors are emitted via events
    });

    const body: ApiResponse<{ status: string }> = {
      data: { status: 'started' },
      meta: null,
      error: null,
    };
    res.status(202).json(body);
  });

  // POST /api/database/cancel
  router.post('/cancel', async (_req: Request, res: Response) => {
    try {
      await downloadManager.cancel();
      const body: ApiResponse<{ status: string }> = {
        data: { status: 'cancelled' },
        meta: null,
        error: null,
      };
      res.json(body);
    } catch {
      const body: ApiResponse<null> = {
        data: null,
        meta: null,
        error: { code: 'NO_ACTIVE_DOWNLOAD', message: 'No download or decompression operation is in progress' },
      };
      res.status(409).json(body);
    }
  });

  // GET /api/database/files — list XML files in data directory
  router.get('/files', async (_req: Request, res: Response) => {
    try {
      const dataDir = downloadManager.getDataDir();
      const entries = await readdir(dataDir);
      const xmlFiles = entries.filter((f) => f.endsWith('.xml'));

      const fileInfos: XmlFileInfo[] = await Promise.all(
        xmlFiles.map(async (filename) => {
          const filePath = path.join(dataDir, filename);
          const stats = await stat(filePath);
          const ageMs = Date.now() - stats.mtime.getTime();
          return {
            filename,
            sizeBytes: stats.size,
            sizeHuman: formatBytes(stats.size),
            modifiedAt: stats.mtime.toISOString(),
            ageMs,
            isMemoryAlphaDump: filename === MEMORY_ALPHA_FILENAME,
            isFresh: ageMs < FRESHNESS_THRESHOLD_MS,
          };
        }),
      );

      const body: ApiResponse<XmlFileInfo[]> = { data: fileInfos, meta: null, error: null };
      res.json(body);
    } catch {
      const body: ApiResponse<XmlFileInfo[]> = { data: [], meta: null, error: null };
      res.json(body);
    }
  });

  // Import state tracking
  let importingFilename: string | null = null;

  // POST /api/database/import — trigger mw-import for a specific XML file
  router.post('/import', async (req: Request, res: Response) => {
    const { filename } = req.body as { filename?: string };

    // Validate filename
    if (!filename || typeof filename !== 'string' || !filename.endsWith('.xml') || filename.includes('/') || filename.includes('\\') || filename.includes('..')) {
      const body: ApiResponse<null> = {
        data: null,
        meta: null,
        error: { code: 'INVALID_FILENAME', message: 'Filename must be a valid .xml file in the data directory' },
      };
      res.status(400).json(body);
      return;
    }

    if (importingFilename) {
      const body: ApiResponse<null> = {
        data: null,
        meta: null,
        error: { code: 'IMPORT_IN_PROGRESS', message: `Import already in progress for ${importingFilename}` },
      };
      res.status(409).json(body);
      return;
    }

    const dataDir = downloadManager.getDataDir();
    const filePath = path.join(dataDir, filename);

    try {
      await stat(filePath);
    } catch {
      const body: ApiResponse<null> = {
        data: null,
        meta: null,
        error: { code: 'FILE_NOT_FOUND', message: `File not found: ${filename}` },
      };
      res.status(404).json(body);
      return;
    }

    importingFilename = filename;

    // Fire and forget — progress is streamed via SSE
    const importer = new MediaWikiImporter({
      xmlFilePath: filePath,
      databasePath,
      onProgress: (stats) => {
        const event: ImportProgressSSEEvent = {
          filename,
          pagesProcessed: stats.pagesProcessed,
          revisionsProcessed: stats.revisionsProcessed,
          pagesSkipped: stats.pagesSkipped,
          elapsedMs: stats.elapsedMs,
        };
        broadcastSSE('import-progress', event);
      },
    });

    importer.run().then((result) => {
      importingFilename = null;
      const event: ImportCompleteSSEEvent = {
        filename,
        totalPages: result.totalPages,
        totalRevisions: result.totalRevisions,
        totalCategories: result.totalCategories,
        skippedPages: result.skippedPages,
        durationMs: result.durationMs,
      };
      broadcastSSE('import-complete', event);
    }).catch((err: unknown) => {
      importingFilename = null;
      const event: ImportErrorSSEEvent = {
        filename,
        message: err instanceof Error ? err.message : 'Import failed',
      };
      broadcastSSE('import-error', event);
    });

    const body: ApiResponse<{ status: string; filename: string }> = {
      data: { status: 'started', filename },
      meta: null,
      error: null,
    };
    res.status(202).json(body);
  });

  return router;
}
