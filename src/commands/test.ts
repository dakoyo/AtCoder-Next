import * as p from '@clack/prompts';
import pc from 'picocolors';
import { findWorkspaceRoot } from '../workspace/finder';
import { getLanguage, t } from '../utils/i18n';
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
  const lang = getLanguage(workspaceRoot);
  const { resolvedTaskDir, resolvedFile, taskLabel, contestId } = resolveArgs(
    workspaceRoot,
    contestIdOrTask,
    taskLabelArg,
    { file: options.file }
  );

  p.intro(pc.cyan(t('testIntro', lang, contestId, taskLabel)));

  const s = p.spinner();
  s.start(t('testRetrievingLimits', lang));
  let timeLimitMs = 2000;
  
  try {
    const client = createAtCoderClient(workspaceRoot);
    const tasks = await fetchContestTasks(workspaceRoot, contestId);
    const taskInfo = tasks.find(t => t.label.toLowerCase() === taskLabel.toLowerCase());
    
    if (taskInfo) {
      const res = await client.get(`/contests/${contestId}/tasks/${taskInfo.id}`);
      const details = parseProblemPage(res.data);
      timeLimitMs = details.timeLimitMs;
      s.stop(t('testLoadedLimits', lang, timeLimitMs));
    } else {
      s.stop(t('testDefaultLimits', lang));
    }
  } catch (err) {
    s.stop(t('testDefaultLimitsError', lang));
  }

  const testSpinner = p.spinner();
  testSpinner.start(t('testCompilingRunning', lang));
  const testRes = await runAllTests(workspaceRoot, resolvedTaskDir, resolvedFile, timeLimitMs);
  testSpinner.stop(t('testFinished', lang));

  if (testRes.compileError) {
    p.log.error(pc.red(t('testCompilationFailed', lang)));
    console.log(testRes.compileError);
    process.exit(1);
  }

  if (testRes.results.length === 0) {
    p.log.warn(t('testNoSamples', lang));
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
      formatOutputLines(res.expectedOutput, res.firstDiffLine).forEach(l => console.log(l));
      console.log(`   ${pc.gray('├────────────────────────────────────────────────────────')}`);
      console.log(`   ${pc.gray('│')} ${pc.bold('Actual Output:')}`);
      formatOutputLines(res.actualOutput, res.firstDiffLine).forEach(l => console.log(l));
      if (res.firstDiffLine) {
        console.log(`   ${pc.gray('├────────────────────────────────────────────────────────')}`);
        console.log(`   ${pc.gray('│')} ${pc.yellow(`First mismatch on line ${res.firstDiffLine}`)}`);
      }
      console.log(`   ${pc.gray('└────────────────────────────────────────────────────────')}`);
    } else if (res.status === 'TLE') {
      allPassed = false;
      p.log.error(`${pc.red(pc.bold('[TLE]'))} ${label}: Time Limit Exceeded (${duration}${memory} vs Limit ${timeLimitMs} ms)`);
    } else if (res.status === 'RE') {
      allPassed = false;
      p.log.error(`${pc.red(pc.bold('[RE]'))} ${label}: Runtime Error (${duration}${memory})`);
      if (res.errorOutput) {
        console.log(`   ${pc.gray('┌────────────────────────────────────────────────────────')}`);
        console.log(`   ${pc.gray('│')} ${pc.bold('Error Output:')}`);
        formatErrorOutputLines(res.errorOutput).forEach(l => console.log(l));
        console.log(`   ${pc.gray('└────────────────────────────────────────────────────────')}`);
      }
    }
  }

  p.outro(allPassed ? pc.green(t('testOutroPassed', lang)) : pc.red(t('testOutroFailed', lang)));
  if (!allPassed) {
    process.exit(1);
  }
}
