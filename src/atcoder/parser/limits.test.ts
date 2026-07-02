import { describe, it, expect } from 'vitest';
import { parseTimeLimit, parseMemoryLimit } from './limits';

describe('limits parser', () => {
  describe('parseTimeLimit', () => {
    it('should parse standard english formats', () => {
      expect(parseTimeLimit('Time Limit: 2 sec')).toBe(2000);
      expect(parseTimeLimit('Time Limit: 2.5 sec')).toBe(2500);
      expect(parseTimeLimit('Time Limit: 1000 ms')).toBe(1000);
    });

    it('should parse standard japanese formats', () => {
      expect(parseTimeLimit('実行時間制限: 2 秒')).toBe(2000);
      expect(parseTimeLimit('実行時間制限: 2.5 秒')).toBe(2500);
      expect(parseTimeLimit('実行時間制限: 1000 ミリ秒')).toBe(1000);
    });

    it('should parse simple formats without labels', () => {
      expect(parseTimeLimit('2 sec')).toBe(2000);
      expect(parseTimeLimit('1500 ms')).toBe(1500);
    });

    it('should throw ParseError on invalid formats', () => {
      expect(() => parseTimeLimit('no limit here')).toThrow();
    });
  });

  describe('parseMemoryLimit', () => {
    it('should parse standard english formats', () => {
      expect(parseMemoryLimit('Memory Limit: 1024 MB')).toBe(1024 * 1024 * 1024);
      expect(parseMemoryLimit('Memory Limit: 1024 MiB')).toBe(1024 * 1024 * 1024);
      expect(parseMemoryLimit('Memory Limit: 256 KB')).toBe(256 * 1024);
      expect(parseMemoryLimit('Memory Limit: 512 KiB')).toBe(512 * 1024);
      expect(parseMemoryLimit('Memory Limit: 1 GB')).toBe(1024 * 1024 * 1024);
      expect(parseMemoryLimit('Memory Limit: 1 GiB')).toBe(1024 * 1024 * 1024);
    });

    it('should parse standard japanese formats', () => {
      expect(parseMemoryLimit('メモリ制限: 1024 MB')).toBe(1024 * 1024 * 1024);
      expect(parseMemoryLimit('メモリ制限: 1024 MiB')).toBe(1024 * 1024 * 1024);
    });

    it('should parse simple formats without labels', () => {
      expect(parseMemoryLimit('1024 MB')).toBe(1024 * 1024 * 1024);
      expect(parseMemoryLimit('512 MiB')).toBe(512 * 1024 * 1024);
    });

    it('should throw ParseError on invalid formats', () => {
      expect(() => parseMemoryLimit('no memory here')).toThrow();
    });
  });
});
