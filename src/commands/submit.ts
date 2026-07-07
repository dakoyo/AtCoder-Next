import * as p from '@clack/prompts';
import pc from 'picocolors';
import { findWorkspaceRoot } from '../workspace/finder';
import { getLanguage, t } from '../utils/i18n';
import { resolveArgs } from './utils';
import { createAtCoderClient } from '../atcoder/client';
import { fetchContestTasks } from '../atcoder/new';
import { parseProblemPage } from '../atcoder/parser/problem-page';
import { runAllTests } from '../test-runner/runner';
import { submitTask } from '../atcoder/submit';
import { parseSubmissionStatus } from '../atcoder/parser/submission-status';
import { AtcError } from '../utils/errors';

export async function handleSubmit(
  contestIdOrTask: string | undefined,
  taskLabelArg: string | undefined,
  options: { file?: string }
) {
  const workspaceRoot = findWorkspaceRoot();
  const lang = getLanguage(workspaceRoot);
  const { resolvedTaskDir, resolvedFile, taskLabel, contestId } = resolveArgs(
    workspaceRoot,
    contestIdOrTask,
    taskLabelArg,
    { file: options.file }
  );

  p.intro(pc.cyan(t('submitPreparing', lang, contestId, taskLabel)));

  const s = p.spinner();
  s.start(t('submitRetrievingLimits', lang));
  let timeLimitMs = 2000;
  let taskId = '';
  
  const client = createAtCoderClient(workspaceRoot);
  const tasks = await fetchContestTasks(workspaceRoot, contestId);
  const taskInfo = tasks.find(t => t.label.toLowerCase() === taskLabel.toLowerCase());
  
  if (!taskInfo) {
    throw new AtcError(`Task label "${taskLabel}" not found in contest "${contestId}".`);
  }
  taskId = taskInfo.id;

  try {
    const res = await client.get(`/contests/${contestId}/tasks/${taskId}`);
    const details = parseProblemPage(res.data);
    timeLimitMs = details.timeLimitMs;
    s.stop(t('testLoadedLimits', lang, timeLimitMs));
  } catch (err) {
    s.stop(t('testDefaultLimitsError', lang));
  }

  p.log.step(t('submitRunningTests', lang));
  const testRes = await runAllTests(workspaceRoot, resolvedTaskDir, resolvedFile, timeLimitMs);

  if (testRes.compileError) {
    p.log.error(pc.red(t('testCompilationFailed', lang)));
    console.log(testRes.compileError);
    process.exit(1);
  }

  const allPassed = testRes.results.length > 0 && testRes.results.every(r => r.status === 'AC');

  if (testRes.results.length === 0) {
    p.log.warn(t('submitNoSamples', lang));
  } else if (!allPassed) {
    p.log.warn(pc.yellow(t('submitTestsFailed', lang)));
    const confirmSubmit = await p.confirm({
      message: t('submitConfirmMessage', lang),
      initialValue: false
    });

    if (p.isCancel(confirmSubmit) || !confirmSubmit) {
      p.cancel(t('submitAborted', lang));
      process.exit(0);
    }
  } else {
    p.log.success(pc.green(t('submitTestsPassed', lang)));
  }

  const subSpinner = p.spinner();
  subSpinner.start(t('submitSubmitting', lang));
  let subDetails;
  try {
    subDetails = await submitTask(workspaceRoot, contestId, taskId, taskLabel, resolvedFile);
    subSpinner.stop(t('submitSuccess', lang, subDetails.submissionId));
    p.note(`https://atcoder.jp${subDetails.url}`, 'Submission URL');
  } catch (err: any) {
    subSpinner.stop('Failed');
    p.log.error(pc.red(err.message));
    process.exit(1);
  }

  const pollSpinner = p.spinner();
  pollSpinner.start(t('submitWaitingJudge', lang));
  
  const pollInterval = 2000;
  const timeout = 300000;
  const startTime = Date.now();
  let completed = false;

  while (Date.now() - startTime < timeout) {
    try {
      const detailRes = await client.get(subDetails.url);
      const status = parseSubmissionStatus(detailRes.data);
      
      pollSpinner.message(`Judge Status: ${pc.yellow(pc.bold(status.status))}`);

      if (status.isCompleted) {
        completed = true;
        pollSpinner.stop(t('submitJudgeFinished', lang, status.status));
        
        const stats = [];
        if (status.score) stats.push(`Score: ${status.score}`);
        if (status.time) stats.push(`Time: ${status.time}`);
        if (status.memory) stats.push(`Memory: ${status.memory}`);
        const statsStr = stats.length > 0 ? ` (${stats.join(', ')})` : '';

        if (status.status === 'AC') {
          p.log.success(`${pc.green(pc.bold('[AC]'))} ${t('submitAccepted', lang)}${statsStr}`);
        } else {
          p.log.error(`${pc.red(pc.bold(`[${status.status}]`))} ${t('submitFailed', lang)}${statsStr}`);
        }
        break;
      }
    } catch (e: any) {
      pollSpinner.message(`Polling status... (network retry: ${e.message})`);
    }
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }

  if (!completed) {
    pollSpinner.stop(t('submitTimeout', lang));
    p.log.warn(t('submitTimeoutWarn', lang, subDetails.url));
  }

  p.outro(pc.green('Done.'));
}
