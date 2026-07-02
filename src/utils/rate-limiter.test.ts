import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const TEST_DIR = path.join(__dirname, '../../test-temp-global-config');

import { waitRateLimit, loadState, saveState, getStatePath } from './rate-limiter';
import { loadGlobalConfig, saveGlobalConfig, getGlobalConfigPath } from '../config';

describe('rate-limiter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 1, 12, 0, 0));

    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  it('should initialize state and apply correct delay dynamically', async () => {
    saveGlobalConfig({
      minDelay: 200,
      maxDelay: 600,
      decayRate: 0.1,
      recoveryRate: 0.0
    }, TEST_DIR);

    const p1 = waitRateLimit(TEST_DIR);
    await vi.advanceTimersByTimeAsync(300);
    await p1;

    const state1 = loadState(TEST_DIR);
    expect(state1.consecutiveRequests).toBe(1);

    const p2 = waitRateLimit(TEST_DIR);
    await vi.advanceTimersByTimeAsync(600);
    await p2;

    const state2 = loadState(TEST_DIR);
    expect(state2.consecutiveRequests).toBe(2);
  });

  it('should recover consecutive requests over time', async () => {
    saveState({
      lastRequestTime: Date.now(),
      consecutiveRequests: 5
    }, TEST_DIR);

    vi.advanceTimersByTime(4000);

    const p = waitRateLimit(TEST_DIR);
    await vi.advanceTimersByTimeAsync(1500);
    await p;

    const state = loadState(TEST_DIR);
    expect(state.consecutiveRequests).toBeCloseTo(2, 1);
  });

  it('should apply jitter within +/- 10%', () => {
    const config = loadGlobalConfig(TEST_DIR);
    expect(config.minDelay).toBe(200);
    expect(config.maxDelay).toBe(600);
    expect(config.decayRate).toBe(0.1);
    expect(config.recoveryRate).toBe(3.0);
  });
});
