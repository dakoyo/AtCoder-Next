import axios, { AxiosInstance } from 'axios';
import { loadSession, getCookieHeaderString } from '../session/store';
import { waitRateLimit } from '../utils/rate-limiter';

export function createAtCoderClient(workspaceRoot: string): AxiosInstance {
  const cookies = loadSession(workspaceRoot);
  const headers: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  };

  if (cookies) {
    headers['Cookie'] = getCookieHeaderString(cookies);
  }

  const client = axios.create({
    baseURL: 'https://atcoder.jp',
    headers,
    timeout: 15000,
  });

  // Apply rate limiting before every request
  client.interceptors.request.use(async (config) => {
    await waitRateLimit();
    return config;
  });

  return client;
}
