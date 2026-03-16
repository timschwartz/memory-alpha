import { workerData, parentPort } from 'node:worker_threads';
import SevenZipModule from '7z-wasm';
import type { SevenZipModuleFactory } from '7z-wasm';

interface WorkerInput {
  archivePath: string;
  outputDir: string;
}

const { archivePath, outputDir } = workerData as WorkerInput;

async function decompress(): Promise<void> {
  // Handle CJS default export interop  
  const factory = (SevenZipModule as unknown as { default: SevenZipModuleFactory }).default ?? SevenZipModule as unknown as SevenZipModuleFactory;
  const sevenZip = await factory({
    print(text: string) {
      // Parse 7z progress output like "  42%" 
      const match = /(\d+)%/.exec(text);
      if (match) {
        parentPort?.postMessage({ type: 'progress', percent: Number(match[1]) });
      }
    },
    printErr() {
      // Suppress stderr noise
    },
  });

  // Extract archive to output directory
  sevenZip.callMain(['x', archivePath, `-o${outputDir}`, '-y']);

  parentPort?.postMessage({ type: 'done' });
}

decompress().catch((err) => {
  parentPort?.postMessage({ type: 'error', message: err instanceof Error ? err.message : 'Decompression failed' });
  process.exit(1);
});
