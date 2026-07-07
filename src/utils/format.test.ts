import { describe, it, expect } from 'vitest';
import { formatOutputLines, formatErrorOutputLines, formatMemory } from './format';
import pc from 'picocolors';

describe('format utilities', () => {
  describe('formatOutputLines', () => {
    it('should format normal lines with line numbers and gray borders', () => {
      const output = 'line1\nline2\n';
      const formatted = formatOutputLines(output);
      
      expect(formatted).toHaveLength(2);
      expect(formatted[0]).toContain('1');
      expect(formatted[0]).toContain('line1');
      expect(formatted[1]).toContain('2');
      expect(formatted[1]).toContain('line2');
    });

    it('should highlight the mismatch line if specified', () => {
      const output = 'line1\nline2\nline3';
      const formatted = formatOutputLines(output, 2);
      
      expect(formatted).toHaveLength(3);
      // Line 2 should be highlighted
      expect(formatted[1]).toContain('>');
      // Check if it has color escape codes (or contains the yellow color function output)
      expect(formatted[1]).toContain(pc.yellow('line2'));
    });

    it('should handle empty/null outputs gracefully', () => {
      expect(formatOutputLines('')).toEqual([`   ${pc.gray('│')}   ${pc.dim('(empty)')}`]);
      expect(formatOutputLines(null as any)).toEqual([`   ${pc.gray('│')}   ${pc.dim('(no output)')}`]);
    });

    it('should omit the > 1 prefix when there is only one line in the output', () => {
      const output = 'singleLine';
      const formatted = formatOutputLines(output, 1);
      
      expect(formatted).toHaveLength(1);
      expect(formatted[0]).not.toContain('>');
      expect(formatted[0]).not.toContain('1');
      expect(formatted[0]).toContain(pc.yellow('singleLine'));
    });

    it('should truncate outputs if they exceed the max display size', () => {
      const output = Array.from({ length: 50 }, (_, i) => `line ${i + 1}`).join('\n');
      const formatted = formatOutputLines(output, 25);
      
      // Should contain truncation indicator
      const hasTruncatedBefore = formatted.some(l => l.includes('truncated'));
      expect(hasTruncatedBefore).toBe(true);
    });
  });

  describe('formatErrorOutputLines', () => {
    it('should format error lines with red color and gray borders', () => {
      const errorOutput = 'error line 1\nerror line 2';
      const formatted = formatErrorOutputLines(errorOutput);
      
      expect(formatted).toHaveLength(2);
      expect(formatted[0]).toContain(pc.red('error line 1'));
      expect(formatted[1]).toContain(pc.red('error line 2'));
    });

    it('should return empty array for empty inputs', () => {
      expect(formatErrorOutputLines('')).toEqual([]);
      expect(formatErrorOutputLines(null as any)).toEqual([]);
    });
  });

  describe('formatMemory', () => {
    it('should handle undefined and NaN', () => {
      expect(formatMemory(undefined)).toBe('Unknown');
      expect(formatMemory(NaN)).toBe('Unknown');
    });

    it('should format bytes correctly', () => {
      expect(formatMemory(500)).toBe('500 B');
    });

    it('should format KiB correctly', () => {
      expect(formatMemory(1024)).toBe('1.0 KiB');
      expect(formatMemory(1024 * 15.5)).toBe('15.5 KiB');
    });

    it('should format MiB correctly', () => {
      expect(formatMemory(1024 * 1024)).toBe('1.0 MiB');
      expect(formatMemory(1024 * 1024 * 4.25)).toBe('4.3 MiB');
    });
  });
});
