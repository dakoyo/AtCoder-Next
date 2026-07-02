import * as cheerio from 'cheerio';
import { saveSession, loadSession, SavedCookie } from './store';
import { createAtCoderClient } from '../atcoder/client';
import { AuthError } from '../utils/errors';

/**
 * Saves a manually entered REVEL_SESSION cookie and verifies the session.
 */
export async function loginWithCookie(workspaceRoot: string, revelSession: string): Promise<string> {
  let cleanSession = revelSession.trim();
  if (!cleanSession) {
    throw new AuthError('REVEL_SESSION cookie value cannot be empty.');
  }

  if (cleanSession.startsWith('REVEL_SESSION=')) {
    cleanSession = cleanSession.substring('REVEL_SESSION='.length);
  }
  cleanSession = cleanSession.split(';')[0].trim();

  if (!cleanSession) {
    throw new AuthError('Could not extract a valid REVEL_SESSION value.');
  }

  const savedCookies: SavedCookie[] = [
    {
      name: 'REVEL_SESSION',
      value: cleanSession,
      domain: '.atcoder.jp',
      path: '/',
      expires: Math.floor(Date.now() / 1000) + 86400 * 30,
      httpOnly: true,
      secure: true,
      sameSite: 'Lax'
    }
  ];

  saveSession(workspaceRoot, savedCookies);

  try {
    const username = await whoami(workspaceRoot);
    return username;
  } catch (err: any) {
    try {
      const { clearSession } = require('./store');
      clearSession(workspaceRoot);
    } catch (e) {}
    throw new AuthError(`The provided REVEL_SESSION cookie is invalid or expired: ${err.message}`);
  }
}

/**
 * Checks the login status by requesting the AtCoder settings page with saved session cookies.
 */
export async function whoami(workspaceRoot: string): Promise<string> {
  const session = loadSession(workspaceRoot);
  if (!session || !session.some(c => c.name === 'REVEL_SESSION')) {
    throw new AuthError('No active session. Please log in using "atc login".');
  }

  const client = createAtCoderClient(workspaceRoot);
  try {
    const res = await client.get('/settings');
    const $ = cheerio.load(res.data);
    
    const userLink = $('header a[href^="/users/"], .navbar-right a[href^="/users/"]').first();
    const href = userLink.attr('href');
    if (href) {
      const match = href.match(/\/users\/([a-zA-Z0-9_]+)/);
      if (match && match[1]) {
        return match[1];
      }
    }

    const usernameSpan = $('header a.username, header .dropdown-toggle').first();
    if (usernameSpan.length) {
      const name = usernameSpan.text().replace(/\s+/g, ' ').trim();
      if (name && name !== 'Sign In' && name !== 'ログイン' && name !== 'Sign Up' && name !== '新規登録') {
        return name;
      }
    }

    throw new AuthError('Session is invalid or expired.');
  } catch (err: any) {
    if (err instanceof AuthError) throw err;
    throw new AuthError(`Failed to verify session: ${err.message}`);
  }
}
