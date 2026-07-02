import { describe, it, expect } from 'vitest';
import { compareOutput } from './diff';

describe('compareOutput', () => {
  it('should match identical strings', () => {
    const res = compareOutput('hello\nworld', 'hello\nworld');
    expect(res.isMatch).toBe(true);
  });

  it('should ignore trailing space and newlines', () => {
    const res = compareOutput('hello   \nworld\n\n', 'hello\nworld');
    expect(res.isMatch).toBe(true);
  });

  it('should detect mismatch and identify line number', () => {
    const res = compareOutput('hello\nworld', 'hello\nthere');
    expect(res.isMatch).toBe(false);
    expect(res.firstDiffLine).toBe(2);
  });

  it('should handle extra lines', () => {
    const res = compareOutput('hello\nworld\nmore', 'hello\nworld');
    expect(res.isMatch).toBe(false);
    expect(res.firstDiffLine).toBe(3);
  });
});
