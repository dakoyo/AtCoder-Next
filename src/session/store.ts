import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface SavedCookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires: number;
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'Strict' | 'Lax' | 'None';
}

export function getSessionPath(workspaceRoot?: string): string {
  return path.join(os.homedir(), '.atcoder-next', 'session.json');
}

export function saveSession(workspaceRoot: string, cookies: SavedCookie[]): void {
  const sessionPath = getSessionPath();
  const dir = path.dirname(sessionPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(sessionPath, JSON.stringify(cookies, null, 2), 'utf8');
}

export function loadSession(workspaceRoot: string): SavedCookie[] | null {
  const globalSessionPath = getSessionPath();
  
  // Migration: if global session doesn't exist, but local session does
  if (!fs.existsSync(globalSessionPath) && workspaceRoot) {
    const localSessionPath = path.join(workspaceRoot, '.atcoder-next', 'session.json');
    if (fs.existsSync(localSessionPath)) {
      try {
        const dir = path.dirname(globalSessionPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.renameSync(localSessionPath, globalSessionPath);
      } catch (e) {
        // If rename fails, try reading local directly
        try {
          const raw = fs.readFileSync(localSessionPath, 'utf8');
          return JSON.parse(raw) as SavedCookie[];
        } catch (err) {
          return null;
        }
      }
    }
  }

  if (!fs.existsSync(globalSessionPath)) {
    return null;
  }
  try {
    const raw = fs.readFileSync(globalSessionPath, 'utf8');
    return JSON.parse(raw) as SavedCookie[];
  } catch (e) {
    return null;
  }
}

export function clearSession(workspaceRoot: string): void {
  const globalSessionPath = getSessionPath();
  if (fs.existsSync(globalSessionPath)) {
    fs.unlinkSync(globalSessionPath);
  }
  
  // Also clean up local session if it exists
  if (workspaceRoot) {
    const localSessionPath = path.join(workspaceRoot, '.atcoder-next', 'session.json');
    if (fs.existsSync(localSessionPath)) {
      try {
        fs.unlinkSync(localSessionPath);
      } catch (e) {}
    }
  }
}

export function getCookieHeaderString(cookies: SavedCookie[]): string {
  return cookies.map(c => `${c.name}=${c.value}`).join('; ');
}
