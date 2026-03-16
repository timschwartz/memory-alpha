import { workerData, parentPort } from 'node:worker_threads';
import path from 'node:path';
import SevenZipModule from '7z-wasm';
import type { SevenZipModuleFactory } from '7z-wasm';

interface WorkerInput {
  archivePath: string;
  outputDir: string;
}

const { archivePath, outputDir } = workerData as WorkerInput;

async function decompress(): Promise<void> {
  const archiveDir = path.dirname(archivePath);
  const archiveFilename = path.basename(archivePath);

  // Handle CJS default export interop  
  const factory = (SevenZipModule as unknown as { default: SevenZipModuleFactory }).default ?? SevenZipModule as unknown as SevenZipModuleFactory;

  let exitCode: number | null = null;
  const stderrLines: string[] = [];

  const sevenZip = await factory({
    print(text: string) {
      // Parse 7z progress output like "  42%" 
      const match = /(\d+)%/.exec(text);
      if (match) {
        parentPort?.postMessage({ type: 'progress', percent: Number(match[1]) });
      }
    },
    printErr(text: string) {
      stderrLines.push(text);
    },
    // Prevent Emscripten from calling process.exit()
    quit(code: number) {
      exitCode = code;
      throw Object.assign(new Error('ExitStatus'), { name: 'ExitStatus', status: code });
    },
  });

  // Mount real filesystem directories via NODEFS so 7z can access them
  sevenZip.FS.mkdir('/archive');
  sevenZip.FS.mkdir('/output');
  sevenZip.FS.mount(sevenZip.NODEFS, { root: archiveDir }, '/archive');
  sevenZip.FS.mount(sevenZip.NODEFS, { root: outputDir }, '/output');

  try {
    sevenZip.callMain(['x', `/archive/${archiveFilename}`, '-o/output', '-y']);
  } catch (e: unknown) {
    // Emscripten throws ExitStatus when quit() is called
    const exitStatus = e as { name?: string; status?: number };
    if (exitStatus?.name === 'ExitStatus' && exitStatus.status === 0) {
      // Normal successful exit
    } else if (exitStatus?.name === 'ExitStatus') {
      const detail = stderrLines.length > 0 ? `: ${stderrLines.join(' ')}` : '';
      throw new Error(`7z exited with code ${exitStatus.status}${detail}`);
    } else {
      throw e;
    }
  }

  // If quit wasn't called, check if there was a captured exit code
  if (exitCode !== null && exitCode !== 0) {
    const detail = stderrLines.length > 0 ? `: ${stderrLines.join(' ')}` : '';
    throw new Error(`7z exited with code ${exitCode}${detail}`);
  }

  parentPort?.postMessage({ type: 'done' });
}

decompress().catch((err) => {
  parentPort?.postMessage({ type: 'error', message: err instanceof Error ? err.message : 'Decompression failed' });
  process.exit(1);
});
