import * as p from '@clack/prompts';
import pc from 'picocolors';
import * as fs from 'fs';
import { findWorkspaceRoot } from '../workspace/finder';
import { getLanguage, t, Language } from '../utils/i18n';
import { whoami, loginWithCookie } from '../session/auth';
import {
  getAvailableBrowsers,
  createTempProfileDir,
  launchBrowser,
  waitForLoginCookie,
  getFreePort
} from '../session/browser';

export async function handleLogin() {
  const workspaceRoot = findWorkspaceRoot();
  const lang = getLanguage(workspaceRoot);
  p.intro(pc.cyan(t('loginIntro', lang)));

  let username: string | undefined;
  try {
    username = await whoami(workspaceRoot);
    p.outro(t("whoamiLoggedIn", lang, username));
  } catch {
    username = await performBrowserOrCookieLogin(workspaceRoot, lang);
    p.outro(pc.green(t('loginWelcome', lang, username)));
  }
}

async function performBrowserOrCookieLogin(workspaceRoot: string, lang: Language): Promise<string> {
  const method = (await p.select({
    message: t('loginMethodSelect', lang),
    options: [
      { value: 'auto', label: t('loginMethodBrowserAuto', lang) },
      { value: 'cookie', label: t('loginMethodCookie', lang) }
    ]
  })) as string;

  if (p.isCancel(method)) {
    p.cancel(t('loginCancelled', lang));
    process.exit(0);
  }

  if (method === 'auto') {
    const browsers = getAvailableBrowsers();
    if (browsers.length === 0) {
      p.log.warn(t('loginNoBrowserDetected', lang));
      const proceed = await p.confirm({
        message: t('loginRetryConfirm', lang),
        initialValue: true
      });
      if (p.isCancel(proceed) || !proceed) {
        p.cancel(t('loginCancelled', lang));
        process.exit(0);
      }
      return promptManualCookie(workspaceRoot, lang);
    }

    let selectedBrowser = browsers[0];
    if (browsers.length > 1) {
      const browserSelection = (await p.select({
        message: t('loginSelectBrowser', lang),
        options: browsers.map((b, idx) => ({ value: idx.toString(), label: b.name }))
      })) as string;
      if (p.isCancel(browserSelection)) {
        p.cancel(t('loginCancelled', lang));
        process.exit(0);
      }
      selectedBrowser = browsers[parseInt(browserSelection, 10)];
    }

    const port = await getFreePort();
    const tempDir = createTempProfileDir();
    const s = p.spinner();

    s.start(t('loginLaunchingBrowser', lang, port));

    let childProc;
    try {
      childProc = launchBrowser(selectedBrowser.path, port, tempDir);
    } catch (e: any) {
      s.stop(t('loginConnectionFailed', lang));
      p.log.error(pc.red(e.message));
      return promptManualCookie(workspaceRoot, lang);
    }

    try {
      s.message(t('loginWaitingInBrowser', lang));
      const cookieVal = await waitForLoginCookie(port, childProc);
      
      if (childProc) {
        try {
          childProc.kill();
        } catch (e) {}
      }
      
      s.message(t('loginVerifying', lang));
      const username = await loginWithCookie(workspaceRoot, cookieVal);
      s.stop(t('loginVerifySuccess', lang));
      return username;
    } catch (err: any) {
      s.stop(t('loginVerifyFailed', lang));
      p.log.error(pc.red(err.message));
      
      if (childProc) {
        try {
          childProc.kill();
        } catch (e) {}
      }

      const retry = await p.confirm({
        message: t('loginRetryConfirm', lang),
        initialValue: true
      });
      if (p.isCancel(retry) || !retry) {
        p.cancel(t('loginAborted', lang));
        process.exit(1);
      }
      return performBrowserOrCookieLogin(workspaceRoot, lang);
    } finally {
      setTimeout(() => {
        try {
          if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
          }
        } catch (e) {}
      }, 5000);
    }
  } else {
    return promptManualCookie(workspaceRoot, lang);
  }
}

async function promptManualCookie(workspaceRoot: string, lang: Language): Promise<string> {
  while (true) {
    const sessionVal = await p.text({
      message: t('loginEnterCookie', lang),
      placeholder: t('loginPlaceholder', lang),
      validate: (val) => (!val.trim() ? t('loginCookieNotEmpty', lang) : undefined)
    });

    if (p.isCancel(sessionVal)) {
      p.cancel(t('loginCancelled', lang));
      process.exit(0);
    }

    const s = p.spinner();
    s.start(t('loginVerifying', lang));
    try {
      const username = await loginWithCookie(workspaceRoot, sessionVal);
      s.stop(t('loginVerifySuccess', lang));
      return username;
    } catch (err: any) {
      s.stop(t('loginVerifyFailed', lang));
      p.log.error(pc.red(err.message));
      
      const retry = await p.confirm({
        message: t('loginRetryConfirm', lang),
        initialValue: true
      });

      if (p.isCancel(retry) || !retry) {
        p.cancel(t('loginAborted', lang));
        process.exit(1);
      }
    }
  }
}
