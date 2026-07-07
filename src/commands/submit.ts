import * as p from '@clack/prompts';
import pc from 'picocolors';
import * as path from 'path';
import * as fs from 'fs';
import { findWorkspaceRoot } from '../workspace/finder';
import { getLocale, t } from '../utils/i18n';
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
  const locale = getLocale(workspaceRoot);
  const { resolvedTaskDir, resolvedFile, taskLabel, contestId } = resolveArgs(
    workspaceRoot,
    contestIdOrTask,
    taskLabelArg,
    { file: options.file }
  );

  p.intro(pc.cyan(t('submitPreparing', locale, contestId, taskLabel)));

  let timeLimitMs = 2000;
  let taskId = '';
  
  const client = createAtCoderClient(workspaceRoot);
  const tasks = await fetchContestTasks(workspaceRoot, contestId);
  const taskInfo = tasks.find(t => t.label.toLowerCase() === taskLabel.toLowerCase());
  
  if (!taskInfo) {
    throw new AtcError(`Task label "${taskLabel}" not found in contest "${contestId}".`);
  }
  taskId = taskInfo.id;

  const metadataPath = path.join(workspaceRoot, '.atcoder-next', 'contest-metadata.json');
  let loadedFromCache = false;

  if (fs.existsSync(metadataPath)) {
    try {
      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
      const taskKey = `${contestId}/${taskLabel}`.toLowerCase();
      if (metadata.tasks && metadata.tasks[taskKey]) {
        timeLimitMs = metadata.tasks[taskKey].timeLimitMs;
        loadedFromCache = true;
      }
    } catch {}
  }

  if (!loadedFromCache) {
    const s = p.spinner();
    s.start(t('submitRetrievingLimits', locale));
    try {
      const res = await client.get(`/contests/${contestId}/tasks/${taskId}`);
      const details = parseProblemPage(res.data);
      timeLimitMs = details.timeLimitMs;
      s.stop(t('testLoadedLimits', locale, timeLimitMs));
      
      let metadata: any = { tasks: {} };
      if (fs.existsSync(metadataPath)) {
        try {
          metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
        } catch {}
      }
      if (!metadata.tasks) {
        metadata.tasks = {};
      }
      const taskKey = `${contestId}/${taskLabel}`.toLowerCase();
      metadata.tasks[taskKey] = {
        timeLimitMs,
        memoryLimitMb: details.memoryLimitBytes ? Math.round(details.memoryLimitBytes / (1024 * 1024)) : 1024
      };
      fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf8');
    } catch (err) {
      s.stop(t('testDefaultLimitsError', locale));
    }
  }

  p.log.step(t('submitRunningTests', locale));
  const testRes = await runAllTests(workspaceRoot, resolvedTaskDir, resolvedFile, timeLimitMs);

  if (testRes.compileError) {
    p.log.error(pc.red(t('testCompilationFailed', locale)));
    console.error(pc.red('\n──────────────────────── Compilation Error ────────────────────────'));
    console.error(testRes.compileError.trim());
    console.error(pc.red('───────────────────────────────────────────────────────────────────\n'));
    process.exit(1);
  }

  const allPassed = testRes.results.length > 0 && testRes.results.every(r => r.status === 'AC');

  if (testRes.results.length === 0) {
    p.log.warn(t('submitNoSamples', locale));
  } else if (!allPassed) {
    p.log.warn(pc.yellow(t('submitTestsFailed', locale)));
    
    const isYes = !process.stdout.isTTY || process.env.ATC_YES === 'true';
    if (isYes) {
      if (process.env.ATC_YES === 'true') {
        p.log.warn('Proceeding with submission automatically due to --yes option.');
      } else {
        p.log.error('Aborting submission automatically in non-interactive environment due to test failures.');
        process.exit(1);
      }
    } else {
      const confirmSubmit = await p.confirm({
        message: t('submitConfirmMessage', locale),
        initialValue: false
      });

      if (p.isCancel(confirmSubmit) || !confirmSubmit) {
        p.cancel(t('submitAborted', locale));
        process.exit(0);
      }
    }
  }

  p.log.success(t('submitTestsPassed', locale));

  const submitSpinner = p.spinner();
  submitSpinner.start(t('submitSubmitting', locale));
  
  let subDetails;
  try {
    subDetails = await submitTask(workspaceRoot, contestId, taskId, taskLabel, resolvedFile);
    submitSpinner.stop(t('submitSuccess', locale, subDetails.submissionId));
  } catch (err: any) {
    const isTurnstile = err.message.includes('Turnstile') ||
                        err.message.includes('cf-challenge') ||
                        err.message.includes('bot protection') ||
                        err.message.includes('rejected') ||
                        err.message === 'Error.' ||
                        err.message === 'Error' ||
                        err.message.includes(t('submitTurnstileDetected', locale)) ||
                        err.message.includes(t('submitRejected', locale));

    if (isTurnstile) {
      submitSpinner.stop(pc.yellow('Manual Submit Required'));
      
      const submitUrl = `https://atcoder.jp/contests/${contestId}/submit?taskScreenName=${taskId}`;
      
      // Copy code content to clipboard
      let codeCopied = false;
      try {
        const { detectCodeFile, resolvePlaceholder } = require('../test-runner/runner');
        const { loadConfig } = require('../config');
        const activeConfig = loadConfig(workspaceRoot);
        const { codeFile, langConfig } = detectCodeFile(workspaceRoot, resolvedTaskDir, activeConfig, options.file);
        if (langConfig.submitFile) {
          const submitFilePath = path.join(resolvedTaskDir, resolvePlaceholder(langConfig.submitFile, codeFile));
          if (fs.existsSync(submitFilePath)) {
            const codeContent = fs.readFileSync(submitFilePath, 'utf8');
            if (codeContent) {
              const { writeClipboard } = require('../utils/clipboard');
              codeCopied = writeClipboard(codeContent);
            }
          }
        }
      } catch {}

      p.log.warn(pc.yellow(t('submitTurnstileDetected', locale)));
      
      if (codeCopied) {
        p.log.info(pc.cyan(t('submitFallbackMessageWithClipboard', locale)));
      } else {
        p.log.info(pc.cyan(t('submitFallbackMessage', locale)));
      }
      p.log.info(`Submission URL: ${pc.bold(submitUrl)}`);

      try {
        const { openUrl } = require('../utils/open');
        openUrl(submitUrl);
      } catch {}

      process.exit(0);
    } else {
      submitSpinner.stop('Failed');
      p.log.error(pc.red(err.message));
      process.exit(1);
    }
  }

  const pollSpinner = p.spinner();
  pollSpinner.start(t('submitWaitingJudge', locale));
  
  let currentInterval = 2000;
  let lastStatusStr = '';
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
        pollSpinner.stop(t('submitJudgeFinished', locale, status.status));
        
        const stats = [];
        if (status.score) stats.push(`Score: ${status.score}`);
        if (status.time) stats.push(`Time: ${status.time}`);
        if (status.memory) stats.push(`Memory: ${status.memory}`);
        const statsStr = stats.length > 0 ? ` (${stats.join(', ')})` : '';

        if (status.status === 'AC') {
          p.log.success(`${pc.green(pc.bold('[AC]'))} ${t('submitAccepted', locale)}${statsStr}`);
        } else {
          p.log.error(`${pc.red(pc.bold(`[${status.status}]`))} ${t('submitFailed', locale)}${statsStr}`);
        }
        break;
      }

      if (status.status !== lastStatusStr) {
        currentInterval = 2000;
        lastStatusStr = status.status;
      } else {
        currentInterval = Math.min(currentInterval * 1.5, 10000);
      }
    } catch (e: any) {
      pollSpinner.message(`Polling status... (network retry: ${e.message})`);
      currentInterval = Math.min(currentInterval * 1.5, 10000);
    }
    await new Promise(resolve => setTimeout(resolve, currentInterval));
  }

  if (!completed) {
    pollSpinner.stop(t('submitTimeout', locale));
    p.log.warn(t('submitTimeoutWarn', locale, subDetails.url));
  }

  p.outro(pc.green('Done.'));
}
