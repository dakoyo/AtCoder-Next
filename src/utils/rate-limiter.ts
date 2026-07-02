import * as fs from 'fs';
import * as path from 'path';
import { getGlobalConfigDir, loadGlobalConfig } from '../config';

export interface RateLimitState {
  lastRequestTime: number;
  consecutiveRequests: number;
}

export const DEFAULT_STATE: RateLimitState = {
  lastRequestTime: 0,
  consecutiveRequests: 0
};

export function getStatePath(customDir?: string): string {
  return path.join(getGlobalConfigDir(customDir), 'state.json');
}

export function loadState(customDir?: string): RateLimitState {
  const statePath = getStatePath(customDir);
  if (!fs.existsSync(statePath)) {
    return DEFAULT_STATE;
  }
  try {
    const raw = fs.readFileSync(statePath, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      lastRequestTime: parsed.lastRequestTime ?? 0,
      consecutiveRequests: parsed.consecutiveRequests ?? 0
    };
  } catch (e) {
    return DEFAULT_STATE;
  }
}

export function saveState(state: RateLimitState, customDir?: string): void {
  const statePath = getStatePath(customDir);
  const dir = path.dirname(statePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf8');
}

let queuePromise = Promise.resolve();

export function waitRateLimit(customDir?: string): Promise<void> {
  const next = queuePromise.then(async () => {
    const config = loadGlobalConfig(customDir);
    const state = loadState(customDir);

    const now = Date.now();
    const elapsedSeconds = state.lastRequestTime > 0 ? (now - state.lastRequestTime) / 1000 : 0;
    
    // Recovery over time
    let consecutiveRequests = Math.max(0, state.consecutiveRequests - elapsedSeconds * config.recoveryRate);

    // Calculate delay: minDelay + (maxDelay - minDelay) * (1 - (1 - decayRate)^consecutiveRequests)
    const baseDelay = config.minDelay + (config.maxDelay - config.minDelay) * (1 - Math.pow(1 - config.decayRate, consecutiveRequests));
    
    // Jitter (±10%)
    const jitter = 1 + (Math.random() * 0.2 - 0.1);
    const delay = Math.max(0, baseDelay * jitter);

    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    // Update state
    const updatedState: RateLimitState = {
      lastRequestTime: Date.now(),
      consecutiveRequests: consecutiveRequests + 1
    };
    saveState(updatedState, customDir);
  });

  queuePromise = next.catch(() => {});
  return next;
}
