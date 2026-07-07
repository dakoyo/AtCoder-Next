import * as p from '@clack/prompts';
import { findWorkspaceRoot } from '../workspace/finder';
import { getLanguage, t } from '../utils/i18n';
import { whoami } from '../session/auth';

export async function handleWhoami() {
  const workspaceRoot = findWorkspaceRoot();
  const lang = getLanguage(workspaceRoot);
  const s = p.spinner();
  s.start(t("whoamiVerifying", lang));
  const username = await whoami(workspaceRoot);
  s.stop(t("whoamiLoggedIn", lang, username));
}
