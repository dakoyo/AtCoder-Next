import * as p from '@clack/prompts';
import pc from 'picocolors';
import * as fs from 'fs';
import { findWorkspaceRoot } from '../workspace/finder';
import { getLocale, t, Locale } from '../utils/i18n';
import { whoami, loginWithCookie } from '../session/auth';
import {
  getAvailableBrowsers,
  createTempProfileDir,
  launchBrowser,
  waitForLoginCookie,
  getFreePort
} from '../session/browser';
import { AtcError } from '../utils/errors';

export async function handleLogin() {
  const workspaceRoot = findWorkspaceRoot();
  const locale = getLocale(workspaceRoot);
  p.intro(pc.cyan(t('loginIntro', locale)));

  let username: string | undefined;
  try {
    username = await whoami(workspaceRoot);
    p.outro(t("whoamiLoggedIn", locale, username));
  } catch {
    username = await performBrowserOrCookieLogin(workspaceRoot, locale);
    p.outro(pc.green(t('loginWelcome', locale, username)));
  }
}

async function performBrowserOrCookieLogin(workspaceRoot: string, locale: Locale): Promise<string> {
  if (!process.stdout.isTTY) {
    throw new AtcError(t('loginNonInteractive', locale));
  }

  const method = (await p.select({
    message: t('loginMethodSelect', locale),
    options: [
      { value: 'auto', label: t('loginMethodBrowserAuto', locale) },
      { value: 'cookie', label: t('loginMethodCookie', locale) }
    ]
  })) as string;

  if (p.isCancel(method)) {
    p.cancel(t('loginCancelled', locale));
    process.exit(0);
  }

  if (method === 'auto') {
    const browsers = getAvailableBrowsers();
    if (browsers.length === 0) {
      p.log.warn(t('loginNoBrowserDetected', locale));
      const proceed = await p.confirm({
        message: t('loginRetryConfirm', locale),
        initialValue: true
      });
      if (p.isCancel(proceed) || !proceed) {
        p.cancel(t('loginCancelled', locale));
        process.exit(0);
      }
      return promptManualCookie(workspaceRoot, locale);
    }

    let selectedBrowser = browsers[0];
    if (browsers.length > 1) {
      const browserSelection = (await p.select({
        message: t('loginSelectBrowser', locale),
        options: browsers.map((b, idx) => ({ value: idx.toString(), label: b.name }))
      })) as string;
      if (p.isCancel(browserSelection)) {
        p.cancel(t('loginCancelled', locale));
        process.exit(0);
      }
      selectedBrowser = browsers[parseInt(browserSelection, 10)];
    }

    const port = await getFreePort();
    const tempDir = createTempProfileDir();
    const s = p.spinner();

    s.start(t('loginLaunchingBrowser', locale, port));

    let childProc;
    try {
      childProc = launchBrowser(selectedBrowser.path, port, tempDir);
    } catch (e: any) {
      s.stop(t('loginConnectionFailed', locale));
      p.log.error(pc.red(e.message));
      return promptManualCookie(workspaceRoot, locale);
    }

    try {
      s.message(t('loginWaitingInBrowser', locale));
      const cookieVal = await waitForLoginCookie(port, childProc);
      
      if (childProc) {
        try {
          childProc.kill();
        } catch (e) {}
      }
      
      s.message(t('loginVerifying', locale));
      const username = await loginWithCookie(workspaceRoot, cookieVal);
      s.stop(t('loginVerifySuccess', locale));
      return username;
    } catch (err: any) {
      s.stop(t('loginVerifyFailed', locale));
      p.log.error(pc.red(err.message));
      
      if (childProc) {
        try {
          childProc.kill();
        } catch (e) {}
      }

      const retry = await p.confirm({
        message: t('loginRetryConfirm', locale),
        initialValue: true
      });
      if (p.isCancel(retry) || !retry) {
        p.cancel(t('loginAborted', locale));
        process.exit(1);
      }
      return performBrowserOrCookieLogin(workspaceRoot, locale);
    } finally {
      try {
        if (fs.existsSync(tempDir)) {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
      } catch (e) {
        process.on('exit', () => {
          try {
            if (fs.existsSync(tempDir)) {
              fs.rmSync(tempDir, { recursive: true, force: true });
            }
          } catch {}
        });
      }
    }
  } else {
    return promptManualCookie(workspaceRoot, locale);
  }
}

async function promptManualCookie(workspaceRoot: string, locale: Locale): Promise<string> {
  while (true) {
    const sessionVal = await p.text({
      message: t('loginEnterCookie', locale),
      placeholder: t('loginPlaceholder', locale),
      validate: (val) => (!val.trim() ? t('loginCookieNotEmpty', locale) : undefined)
    });

    if (p.isCancel(sessionVal)) {
      p.cancel(t('loginCancelled', locale));
      process.exit(0);
    }

    const s = p.spinner();
    s.start(t('loginVerifying', locale));
    try {
      const username = await loginWithCookie(workspaceRoot, sessionVal);
      s.stop(t('loginVerifySuccess', locale));
      return username;
    } catch (err: any) {
      s.stop(t('loginVerifyFailed', locale));
      p.log.error(pc.red(err.message));
      
      const retry = await p.confirm({
        message: t('loginRetryConfirm', locale),
        initialValue: true
      });

      if (p.isCancel(retry) || !retry) {
        p.cancel(t('loginAborted', locale));
        process.exit(1);
      }
    }
  }
}
