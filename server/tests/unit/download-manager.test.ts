import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DownloadManager } from '../../src/lib/download-manager.js';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';

describe('DownloadManager', () => {
  let dataDir: string;
  let manager: DownloadManager;

  beforeEach(() => {
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dl-test-'));
    manager = new DownloadManager(dataDir);
  });

  describe('initial state', () => {
    it('starts in idle state', () => {
      const status = manager.getStatus();
      expect(status.state).toBe('idle');
      expect(status.phase).toBeNull();
      expect(status.percent).toBeNull();
      expect(status.error).toBeNull();
    });

    it('is not active initially', () => {
      expect(manager.isActive()).toBe(false);
    });

    it('returns the data directory', () => {
      expect(manager.getDataDir()).toBe(dataDir);
    });
  });

  describe('cancel', () => {
    it('throws when no active operation', async () => {
      await expect(manager.cancel()).rejects.toThrow('No download or decompression operation is in progress');
    });
  });

  describe('event emitter', () => {
    it('emits events as an EventEmitter', () => {
      const handler = vi.fn();
      manager.on('progress', handler);
      manager.emit('progress', { test: true });
      expect(handler).toHaveBeenCalledWith({ test: true });
    });
  });
});
