import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';

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

const ALGORITHM = 'aes-256-cbc';

function getEncryptionKey(): Buffer {
  const dir = path.join(os.homedir(), '.atcoder-next');
  const keyPath = path.join(dir, '.key');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (fs.existsSync(keyPath)) {
    try {
      return fs.readFileSync(keyPath);
    } catch {
      // Fallback if read fails
    }
  }
  const key = crypto.randomBytes(32);
  try {
    fs.writeFileSync(keyPath, key, { mode: 0o600 });
  } catch {}
  return key;
}

function encrypt(text: string): string {
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  } catch {
    return text; // Fallback
  }
}

function decrypt(text: string): string {
  try {
    const key = getEncryptionKey();
    const parts = text.split(':');
    if (parts.length < 2) return text; // Not encrypted
    const iv = Buffer.from(parts.shift() || '', 'hex');
    const encryptedText = parts.join(':');
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch {
    return text; // Fallback
  }
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
  const jsonStr = JSON.stringify(cookies, null, 2);
  const encryptedData = encrypt(jsonStr);
  fs.writeFileSync(sessionPath, encryptedData, { encoding: 'utf8', mode: 0o600 });
}

export function loadSession(workspaceRoot: string): SavedCookie[] | null {
  const globalSessionPath = getSessionPath();
  
  // Migration: if global session doesn't exist, but local session does
  if (!fs.existsSync(globalSessionPath) && workspaceRoot) {
    const localSessionPath = path.join(workspaceRoot, '.atcoder-next', 'session.json');
    if (fs.existsSync(localSessionPath)) {
      try {
        const raw = fs.readFileSync(localSessionPath, 'utf8');
        const cookies = JSON.parse(raw) as SavedCookie[];
        // Save globally with encryption
        saveSession(workspaceRoot, cookies);
        // Remove local plaintext file immediately
        fs.unlinkSync(localSessionPath);
        return cookies;
      } catch (err) {
        return null;
      }
    }
  }

  if (!fs.existsSync(globalSessionPath)) {
    return null;
  }
  try {
    const raw = fs.readFileSync(globalSessionPath, 'utf8');
    const decrypted = decrypt(raw);
    return JSON.parse(decrypted) as SavedCookie[];
  } catch (e) {
    return null;
  }
}

export function clearSession(workspaceRoot: string): void {
  const globalSessionPath = getSessionPath();
  if (fs.existsSync(globalSessionPath)) {
    try {
      fs.unlinkSync(globalSessionPath);
    } catch {}
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
