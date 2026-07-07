import * as p from '@clack/prompts';
import pc from 'picocolors';
import * as path from 'path';
import * as fs from 'fs';
import { findWorkspaceRoot } from '../workspace/finder';
import { loadConfig } from '../config';
import { getLanguage, t } from '../utils/i18n';
import { fetchContestTasks, setupTask } from '../atcoder/new';
import { AtcError } from '../utils/errors';

export async function handleNew(contestId: string, taskLabel: string | undefined, options: { all?: boolean }) {
  const workspaceRoot = findWorkspaceRoot();
  const config = loadConfig(workspaceRoot);
  const lang = getLanguage(workspaceRoot);
  const contestParentDir = config.contestDir ? path.join(workspaceRoot, config.contestDir) : workspaceRoot;
  
  const contestDir = path.join(contestParentDir, contestId);
  if (fs.existsSync(contestDir)) {
    throw new AtcError(t('newContestDirExists', lang, contestId));
  }

  p.intro(pc.cyan(t('newIntro', lang, contestId)));

  const s = p.spinner();
  s.start(t('newFetchingTasks', lang, contestId));
  const tasks = await fetchContestTasks(workspaceRoot, contestId);
  s.stop(t('newFoundTasks', lang, tasks.length));

  if (tasks.length === 0) {
    throw new AtcError(t('newNoTasksFound', lang, contestId));
  }

  let selectedTasks = tasks;

  if (options.all) {
    selectedTasks = tasks;
  } else if (taskLabel) {
    const matched = tasks.find(t => t.label.toLowerCase() === taskLabel.toLowerCase());
    if (!matched) {
      throw new AtcError(t('newLabelNotFound', lang, taskLabel, contestId, tasks.map(t => t.label).join(', ')));
    }
    selectedTasks = [matched];
  } else {
    const taskOptions = tasks.map(t => ({
      value: t.id,
      label: `${t.label.toUpperCase()} - ${t.id}`
    }));
    
    const selection = await p.multiselect({
      message: t('newMultiselectMessage', lang),
      options: taskOptions,
      initialValues: tasks.map(t => t.id),
      required: true
    }) as string[];

    if (p.isCancel(selection)) {
      p.cancel(t('newCancelled', lang));
      process.exit(0);
    }

    selectedTasks = tasks.filter(t => selection.includes(t.id));
  }

  const setupSpinner = p.spinner();
  let hasSkippedProblemStatement = false;
  for (let i = 0; i < selectedTasks.length; i++) {
    const tObj = selectedTasks[i];

    setupSpinner.start(t('newSettingUpTask', lang, tObj.label.toUpperCase(), tObj.id));
    const res = await setupTask(workspaceRoot, contestId, tObj);
    setupSpinner.stop(t('newSetupSuccess', lang, tObj.label.toUpperCase(), res.sampleCount));
    if (res.skippedProblemStatement) {
      hasSkippedProblemStatement = true;
    }
  }

  p.outro(pc.green(t('newScaffoldingComplete', lang, selectedTasks.length)));

  if (hasSkippedProblemStatement) {
    p.log.warn(pc.yellow(t('newStatementSkippedContestActiveTitle', lang)));
    p.log.message(t('newStatementSkippedContestActiveBody', lang));
  } else if (config.extractProblemStatement) {
    p.log.warn(pc.yellow(t('newStatementWarningTitle', lang)));
    p.log.message(t('newStatementWarningBody', lang));
  }
}
