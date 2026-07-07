import * as p from '@clack/prompts';
import { findWorkspaceRoot } from '../workspace/finder';
import { getLocale, t } from '../utils/i18n';
import { clearSession } from '../session/store';

export async function handleLogout() {
  const workspaceRoot = findWorkspaceRoot();
  const locale = getLocale(workspaceRoot);
  clearSession(workspaceRoot);
  p.log.success(t('logoutSuccess', locale));
}
