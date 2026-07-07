import * as p from '@clack/prompts';
import { findWorkspaceRoot } from '../workspace/finder';
import { getLanguage, t } from '../utils/i18n';
import { resolveArgs } from './utils';
import { fetchContestTasks } from '../atcoder/new';
import { openUrl } from '../utils/open';
import { AtcError } from '../utils/errors';

export async function handleOpen(contestIdArg: string | undefined, taskLabelArg: string | undefined) {
  const workspaceRoot = findWorkspaceRoot();
  const lang = getLanguage(workspaceRoot);
  const { taskLabel, contestId } = resolveArgs(workspaceRoot, contestIdArg, taskLabelArg, { allowNonExistent: true });

  if (!contestId) {
    throw new AtcError('Contest ID could not be determined. Please specify it explicitly (e.g., "atc open abc300").');
  }

  const s = p.spinner();
  s.start(t('openRetrievingUrl', lang));
  
  try {
    const tasks = await fetchContestTasks(workspaceRoot, contestId);
    
    if (taskLabel) {
      const taskInfo = tasks.find(t => t.label.toLowerCase() === taskLabel.toLowerCase());
      if (taskInfo) {
        const url = `https://atcoder.jp/contests/${contestId}/tasks/${taskInfo.id}`;
        s.stop(t('openSuccess', lang, url));
        openUrl(url);
      } else {
        s.stop(t('openTaskNotFound', lang, taskLabel, contestId));
        process.exit(1);
      }
    } else {
      const url = `https://atcoder.jp/contests/${contestId}`;
      s.stop(t('openSuccess', lang, url));
      openUrl(url);
    }
  } catch (err: any) {
    s.stop(t('openFailed', lang, err.message));
    process.exit(1);
  }
}
