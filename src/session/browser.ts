import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as net from 'net';
import { spawn, execSync, ChildProcess } from 'child_process';
import { chromium } from 'playwright-core';
import axios from 'axios';
import * as cheerio from 'cheerio';

/**
 * Finds an unused port dynamically on localhost.
 */
export function getFreePort(): Promise<number> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = (address && typeof address !== 'string') ? address.port : 9222;
      server.close(() => {
        resolve(port);
      });
    });
  });
}

export interface BrowserInfo {
  name: string;
  path: string;
  type: 'chrome' | 'edge' | 'brave' | 'chromium';
}

/**
 * Detects chromium-based browsers installed on the system.
 */
export function getAvailableBrowsers(): BrowserInfo[] {
  const platform = os.platform();
  const browsers: BrowserInfo[] = [];

  if (platform === 'darwin') {
    const macBrowsers = [
      { name: 'Google Chrome', path: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', type: 'chrome' as const },
      { name: 'Microsoft Edge', path: '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge', type: 'edge' as const },
      { name: 'Brave Browser', path: '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser', type: 'brave' as const },
      { name: 'Chromium', path: '/Applications/Chromium.app/Contents/MacOS/Chromium', type: 'chromium' as const },
    ];
    for (const b of macBrowsers) {
      if (fs.existsSync(b.path)) {
        browsers.push(b);
      }
    }
  } else if (platform === 'win32') {
    const localAppData = process.env.LOCALAPPDATA || '';
    const programFiles = process.env.PROGRAMFILES || 'C:\\Program Files';
    const programFilesX86 = process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)';

    const winBrowsers = [
      {
        name: 'Google Chrome',
        paths: [
          path.join(programFiles, 'Google\\Chrome\\Application\\chrome.exe'),
          path.join(programFilesX86, 'Google\\Chrome\\Application\\chrome.exe'),
          path.join(localAppData, 'Google\\Chrome\\Application\\chrome.exe'),
        ],
        type: 'chrome' as const
      },
      {
        name: 'Microsoft Edge',
        paths: [
          path.join(programFilesX86, 'Microsoft\\Edge\\Application\\msedge.exe'),
          path.join(programFiles, 'Microsoft\\Edge\\Application\\msedge.exe'),
        ],
        type: 'edge' as const
      },
      {
        name: 'Brave Browser',
        paths: [
          path.join(programFiles, 'BraveSoftware\\Brave-Browser\\Application\\brave.exe'),
          path.join(localAppData, 'BraveSoftware\\Brave-Browser\\Application\\brave.exe'),
        ],
        type: 'brave' as const
      },
    ];

    for (const b of winBrowsers) {
      for (const p of b.paths) {
        if (fs.existsSync(p)) {
          browsers.push({ name: b.name, path: p, type: b.type });
          break;
        }
      }
    }
  } else if (platform === 'linux') {
    const linuxBrowsers = [
      { name: 'Google Chrome', cmd: 'google-chrome', type: 'chrome' as const },
      { name: 'Google Chrome Stable', cmd: 'google-chrome-stable', type: 'chrome' as const },
      { name: 'Chromium', cmd: 'chromium', type: 'chromium' as const },
      { name: 'Chromium Browser', cmd: 'chromium-browser', type: 'chromium' as const },
      { name: 'Brave Browser', cmd: 'brave-browser', type: 'brave' as const },
      { name: 'Brave', cmd: 'brave', type: 'brave' as const },
      { name: 'Microsoft Edge', cmd: 'microsoft-edge', type: 'edge' as const },
      { name: 'Microsoft Edge Stable', cmd: 'microsoft-edge-stable', type: 'edge' as const },
    ];

    for (const b of linuxBrowsers) {
      try {
        const resolvedPath = execSync(`which ${b.cmd}`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
        if (resolvedPath && fs.existsSync(resolvedPath)) {
          if (!browsers.some(existing => existing.path === resolvedPath)) {
            browsers.push({ name: b.name, path: resolvedPath, type: b.type });
          }
        }
      } catch {
        // which failed
      }
    }
  }

  return browsers;
}

/**
 * Creates a clean temporary directory for the browser profile.
 */
export function createTempProfileDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'atcoder-next-chrome-'));
}

/**
 * Launches a browser in the background with remote debugging enabled.
 */
export function launchBrowser(browserPath: string, port: number, tempDir: string, startUrl = 'https://atcoder.jp/login'): ChildProcess {
  const args = [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${tempDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    startUrl
  ];

  const child = spawn(browserPath, args, {
    detached: true,
    stdio: 'ignore'
  });

  child.unref();
  return child;
}

/**
 * Verifies if the REVEL_SESSION cookie value is authenticated by requesting AtCoder settings.
 */
async function verifyCookieValue(revelSession: string): Promise<boolean> {
  try {
    const res = await axios.get('https://atcoder.jp/settings', {
      headers: {
        'Cookie': `REVEL_SESSION=${revelSession}`,
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      timeout: 10000,
    });
    const $ = cheerio.load(res.data);
    const userLink = $('header a[href^="/users/"], .navbar-right a[href^="/users/"]').first();
    const href = userLink.attr('href');
    if (href) {
      const match = href.match(/\/users\/([a-zA-Z0-9_]+)/);
      if (match && match[1]) {
        return true;
      }
    }
    return false;
  } catch (e) {
    return false;
  }
}

/**
 * Connects to the browser via CDP on the given port and waits for the REVEL_SESSION cookie.
 */
export async function waitForLoginCookie(port: number, childProc?: ChildProcess, timeoutMs = 300000): Promise<string> {
  const startTime = Date.now();
  let browser: any;

  // Try to connect to the browser CDP port (retry for up to 10 seconds)
  for (let i = 0; i < 30; i++) {
    if (childProc && childProc.exitCode !== null) {
      throw new Error(`Browser process exited unexpectedly with code ${childProc.exitCode}.`);
    }
    try {
      browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
      break;
    } catch (e) {
      if (Date.now() - startTime > 15000) {
        throw new Error('Failed to connect to the browser via remote debugging port.');
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  if (!browser) {
    throw new Error('Browser connection timed out.');
  }

  try {
    while (Date.now() - startTime < timeoutMs) {
      if (childProc && childProc.exitCode !== null) {
        throw new Error(`Browser process exited unexpectedly with code ${childProc.exitCode}.`);
      }
      if (!browser.isConnected()) {
        throw new Error('Browser connection was closed.');
      }

      const contexts = browser.contexts();
      for (const context of contexts) {
        const cookies = await context.cookies();
        const sessionCookie = cookies.find((c: any) => c.name === 'REVEL_SESSION');
        if (sessionCookie && sessionCookie.value) {
          // Verify if this cookie is actually an authenticated session
          const isValid = await verifyCookieValue(sessionCookie.value);
          if (isValid) {
            return sessionCookie.value;
          }
        }
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    throw new Error('Login timed out.');
  } finally {
    try {
      await browser.close();
    } catch (e) {
      // ignore
    }
  }
}


