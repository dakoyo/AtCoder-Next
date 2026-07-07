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
import { formatOutputLines, formatErrorOutputLines, formatMemory } from '../utils/format';

export async function handleTest(
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

  p.intro(pc.cyan(t('testIntro', locale, contestId, taskLabel)));

  let timeLimitMs = 2000;
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
    s.start(t('testRetrievingLimits', locale));
    try {
      const client = createAtCoderClient(workspaceRoot);
      const tasks = await fetchContestTasks(workspaceRoot, contestId);
      const taskInfo = tasks.find(t => t.label.toLowerCase() === taskLabel.toLowerCase());
      
      if (taskInfo) {
        const res = await client.get(`/contests/${contestId}/tasks/${taskInfo.id}`);
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
      } else {
        s.stop(t('testDefaultLimits', locale));
      }
    } catch (err) {
      s.stop(t('testDefaultLimitsError', locale));
    }
  }

  const testSpinner = p.spinner();
  testSpinner.start(t('testCompilingRunning', locale));
  const testRes = await runAllTests(workspaceRoot, resolvedTaskDir, resolvedFile, timeLimitMs);
  testSpinner.stop(t('testFinished', locale));

  if (testRes.compileError) {
    p.log.error(pc.red(t('testCompilationFailed', locale)));
    console.error(pc.red('\n──────────────────────── Compilation Error ────────────────────────'));
    console.error(testRes.compileError.trim());
    console.error(pc.red('───────────────────────────────────────────────────────────────────\n'));
    process.exit(1);
  }

  if (testRes.results.length === 0) {
    p.log.warn(t('testNoSamples', locale));
    process.exit(0);
  }

  let allPassed = true;
  for (const res of testRes.results) {
    const label = `sample-${res.index}`;
    const duration = `${res.durationMs.toFixed(0)} ms`;
    const memory = res.memoryByte !== undefined ? `, Memory: ${formatMemory(res.memoryByte)}` : '';

    if (res.status === 'AC') {
      p.log.success(`${pc.green(pc.bold('[AC]'))} ${label}: Passed (${duration}${memory})`);
    } else if (res.status === 'WA') {
      allPassed = false;
      p.log.error(`${pc.red(pc.bold('[WA]'))} ${label}: Failed (${duration}${memory})`);
      console.log(`   ${pc.gray('┌────────────────────────────────────────────────────────')}`);
      console.log(`   ${pc.gray('│')} ${pc.bold('Expected Output:')}`);
      console.log(formatOutputLines(res.expectedOutput, res.firstDiffLine).join('\n'));
      console.log(`   ${pc.gray('├────────────────────────────────────────────────────────')}`);
      console.log(`   ${pc.gray('│')} ${pc.bold('Actual Output:')}`);
      console.log(formatOutputLines(res.actualOutput, res.firstDiffLine).join('\n'));
      console.log(`   ${pc.gray('└────────────────────────────────────────────────────────')}`);
    } else if (res.status === 'RE') {
      allPassed = false;
      p.log.error(`${pc.red(pc.bold('[RE]'))} ${label}: Runtime Error (${duration}${memory})`);
      console.log(`   ${pc.gray('┌────────────────────────────────────────────────────────')}`);
      console.log(`   ${pc.gray('│')} ${pc.bold('Error Output:')}`);
      console.log(formatErrorOutputLines(res.errorOutput || '').join('\n'));
      console.log(`   ${pc.gray('└────────────────────────────────────────────────────────')}`);
    } else if (res.status === 'TLE') {
      allPassed = false;
      p.log.error(`${pc.red(pc.bold('[TLE]'))} ${label}: Time Limit Exceeded (Limit: ${timeLimitMs} ms)`);
    }
  }

  p.outro(allPassed ? pc.green(t('testOutroPassed', locale)) : pc.red(t('testOutroFailed', locale)));

  if (!allPassed) {
    process.exit(1);
  }
}
