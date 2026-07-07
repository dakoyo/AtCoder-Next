import * as p from '@clack/prompts';
import { findWorkspaceRoot } from '../workspace/finder';
import { getLocale, t } from '../utils/i18n';
import { whoami } from '../session/auth';

export async function handleWhoami() {
  const workspaceRoot = findWorkspaceRoot();
  const locale = getLocale(workspaceRoot);
  const s = p.spinner();
  s.start(t("whoamiVerifying", locale));
  const username = await whoami(workspaceRoot);
  s.stop(t("whoamiLoggedIn", locale, username));
}
