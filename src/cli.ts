#!/usr/bin/env node

import pkg from "../package.json"

import { Command } from 'commander';
import * as p from '@clack/prompts';
import pc from 'picocolors';
import * as fs from 'fs';
import * as path from 'path';

import { findWorkspaceRoot } from './workspace/finder';
import { initWorkspace, LANGUAGE_PRESETS, addLanguage, InitOptions } from './workspace/initializer';
import { loginWithCookie, whoami } from './session/auth';
import { clearSession, loadSession } from './session/store';
import {
  getAvailableBrowsers,
  createTempProfileDir,
  launchBrowser,
  waitForLoginCookie,
  getFreePort
} from './session/browser';
import { chromium } from 'playwright-core';
import { fetchContestTasks, setupTask } from './atcoder/new';
import { loadConfig, saveConfig } from './config';
import { runAllTests, resolveTaskDirectory, detectCodeFile } from './test-runner/runner';
import { submitTask } from './atcoder/submit';
import { createAtCoderClient } from './atcoder/client';
import { parseSubmissionStatus } from './atcoder/parser/submission-status';
import { parseProblemPage } from './atcoder/parser/problem-page';
import { AtcError, WorkspaceNotFoundError } from './utils/errors';
import { formatOutputLines, formatErrorOutputLines } from './utils/format';
import { getLanguage, t, getSystemLanguage } from './utils/i18n';
import { openUrl, copyToClipboard } from './utils/open';
import { bundleFiles } from './utils/bundler';
import { runDoctor, runSetup } from './toolchain/cli-handlers';

const workspaceRoot = (() => {
  try {
    return findWorkspaceRoot();
  } catch {
    return undefined;
  }
})();
const lang = getLanguage(workspaceRoot);

const program = new Command();

program
  .name('atc')
  .description('AtCoder Next')
  .version(pkg.version);

function handleAction(fn: (...args: any[]) => Promise<void>) {
  return async (...args: any[]) => {
    try {
      await fn(...args);
    } catch (err: any) {
      let errMsg = err.message || 'An unexpected error occurred.';
      if (err instanceof WorkspaceNotFoundError) {
        errMsg = t('workspaceNotFound', lang);
      }
      p.log.error(pc.red(errMsg));
      process.exit(1);
    }
  };
}

program
  .command('init')
  .description(t('descInit', lang))
  .action(
    handleAction(async () => {
      const systemLang = getSystemLanguage();
      const defaultDisplayLang = systemLang === 'ja' ? 'ja' : 'en';

      const selectedDisplayLang = await p.select({
        message: defaultDisplayLang === 'ja' ? '表示言語を選択してください (Select display language):' : 'Select display language (表示言語を選択してください):',
        options: [
          { value: 'en', label: 'English' },
          { value: 'ja', label: '日本語' }
        ],
        initialValue: defaultDisplayLang
      }) as 'en' | 'ja';

      if (p.isCancel(selectedDisplayLang)) {
        p.cancel(t('initCancelled', defaultDisplayLang));
        process.exit(0);
      }

      p.intro(pc.cyan(t('initIntro', selectedDisplayLang)));

      const extractProblemStatement = await p.confirm({
        message: t('initSelectExtractProblem', selectedDisplayLang),
        initialValue: false
      });

      if (p.isCancel(extractProblemStatement)) {
        p.cancel(t('initCancelled', selectedDisplayLang));
        process.exit(0);
      }
      let problemLang: 'en' | 'ja' = selectedDisplayLang;
      if (extractProblemStatement) {
        problemLang = await p.select({
          message: t('initSelectProblemLang', selectedDisplayLang),
          options: [
            { value: 'ja', label: selectedDisplayLang === 'ja' ? '日本語' : 'Japanese' },
            { value: 'en', label: selectedDisplayLang === 'ja' ? '英語' : 'English' }
          ],
          initialValue: selectedDisplayLang
        }) as 'en' | 'ja';
      }

      if (p.isCancel(problemLang)) {
        p.cancel(t('initCancelled', selectedDisplayLang));
        process.exit(0);
      }

      const defaultLanguage = await p.select({
        message: t('initSelectLang', selectedDisplayLang),
        options: [
          { value: 'cpp', label: 'C++ (cpp)' },
          { value: 'python', label: 'Python (python)' },
          { value: 'rust', label: 'Rust (rust)' },
          { value: 'typescript', label: 'TypeScript (typescript)' },
          { value: 'javascript', label: 'JavaScript (javascript)' },
          { value: 'c', label: 'C (c)' }
        ]
      });

      if (p.isCancel(defaultLanguage)) {
        p.cancel(t('initCancelled', selectedDisplayLang));
        process.exit(0);
      }
      
      const targetDir = process.cwd();
      const s = p.spinner();
      s.start(t('initSpinner', selectedDisplayLang));
      
      const initOptions: InitOptions = {
        defaultLanguage: defaultLanguage as string,
        lang: selectedDisplayLang,
        extractProblemStatement: extractProblemStatement as boolean,
        problemLang: problemLang
      };

      const { alreadyInitialized, gitignoreUpdated } = initWorkspace(targetDir, initOptions);
      
      s.stop(t('initFilesSet', selectedDisplayLang));

      if (alreadyInitialized) {
        p.log.warn(t('initAlreadyInitialized', selectedDisplayLang));
      } else {
        p.log.success(t('initCreatedConfig', selectedDisplayLang, defaultLanguage));
      }

      if (gitignoreUpdated) {
        p.log.success(t('initGitignoreUpdated', selectedDisplayLang));
      }

      p.outro(pc.green(t('initOutro', selectedDisplayLang)));
    })
  );

program
  .command('login')
  .description(t('descLogin', lang))
  .action(
    handleAction(async () => {
      p.intro(pc.cyan(t('loginIntro', lang)));
      const workspaceRoot = findWorkspaceRoot();

      let username: string | undefined;
      try {
        username = await whoami(workspaceRoot);
        p.outro(t("whoamiLoggedIn", lang, username));
      } catch {
        username = await performBrowserOrCookieLogin(workspaceRoot);
        p.outro(pc.green(t('loginWelcome', lang, username)));
      }
    })
  );

async function performBrowserOrCookieLogin(workspaceRoot: string): Promise<string> {
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
      return promptManualCookie(workspaceRoot);
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
      return promptManualCookie(workspaceRoot);
    }

    try {
      s.message(t('loginWaitingInBrowser', lang));
      const cookieVal = await waitForLoginCookie(port);
      
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
      return performBrowserOrCookieLogin(workspaceRoot);
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
    return promptManualCookie(workspaceRoot);
  }
}

async function promptManualCookie(workspaceRoot: string): Promise<string> {
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

program
  .command('logout')
  .description(t('descLogout', lang))
  .action(
    handleAction(async () => {
      const workspaceRoot = findWorkspaceRoot();
      clearSession(workspaceRoot);
      p.log.success(t('logoutSuccess', lang));
    })
  );

program
  .command('whoami')
  .description(t('descWhoami', lang))
  .action(
    handleAction(async () => {
      const workspaceRoot = findWorkspaceRoot();
      const s = p.spinner();
      s.start(t("whoamiVerifying", lang));
      const username = await whoami(workspaceRoot);
      s.stop(t("whoamiLoggedIn", lang, username));
    })
  );

program
  .command('new <contest> [task]')
  .description(t('descNew', lang))
  .option('-a, --all', 'Download all tasks for the contest')
  .action(
    handleAction(async (contestId: string, taskLabel: string | undefined, options: { all?: boolean }) => {
      const workspaceRoot = findWorkspaceRoot();
      const config = loadConfig(workspaceRoot);
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
    })
  );

function resolveArgs(
  workspaceRoot: string,
  arg1: string | undefined,
  arg2: string | undefined,
  arg3: string | undefined
) {
  const cwd = process.cwd();
  const config = loadConfig(workspaceRoot);
  const contestDir = config.contestDir || '';

  let resolvedTaskDir = '';
  let resolvedFile: string | undefined;

  // Helper function to check if relative path parts exist in cwd, workspaceRoot or contestDir
  function checkPath(relativeParts: string[]): { isFile: boolean; isDir: boolean; path: string } | null {
    const pathsToTry = [
      path.resolve(cwd, ...relativeParts),
      path.resolve(workspaceRoot, ...relativeParts),
      path.resolve(workspaceRoot, contestDir, ...relativeParts)
    ];

    for (const p of pathsToTry) {
      if (fs.existsSync(p)) {
        const stat = fs.statSync(p);
        return {
          isFile: stat.isFile(),
          isDir: stat.isDirectory(),
          path: p
        };
      }
    }
    return null;
  }

  if (arg1 && arg2 && arg3) {
    const checkDir = checkPath([arg1, arg2]);
    if (checkDir && checkDir.isDir) {
      resolvedTaskDir = checkDir.path;
      resolvedFile = arg3;
    }
  }

  if (!resolvedTaskDir && arg1 && arg2) {
    const checkDir = checkPath([arg1, arg2]);
    if (checkDir && checkDir.isDir) {
      resolvedTaskDir = checkDir.path;
      resolvedFile = undefined;
    } else {
      const checkArg1 = checkPath([arg1]);
      if (checkArg1 && checkArg1.isDir) {
        resolvedTaskDir = checkArg1.path;
        resolvedFile = arg2;
      }
    }
  }

  if (!resolvedTaskDir && arg1) {
    const checkArg1 = checkPath([arg1]);
    if (checkArg1) {
      if (checkArg1.isFile) {
        resolvedTaskDir = path.dirname(checkArg1.path);
        resolvedFile = path.basename(checkArg1.path);
      } else if (checkArg1.isDir) {
        resolvedTaskDir = checkArg1.path;
        resolvedFile = undefined;
      }
    } else {
      resolvedTaskDir = resolveTaskDirectory(workspaceRoot, arg1);
      resolvedFile = undefined;
    }
  }

  if (!resolvedTaskDir) {
    resolvedTaskDir = resolveTaskDirectory(workspaceRoot, undefined);
    resolvedFile = undefined;
  }

  const taskLabel = path.basename(resolvedTaskDir);
  const contestId = path.basename(path.dirname(resolvedTaskDir));

  return { resolvedTaskDir, resolvedFile, taskLabel, contestId };
}

program
  .command('test [arg1] [arg2] [arg3]')
  .description(t('descTest', lang))
  .action(
    handleAction(async (arg1: string | undefined, arg2: string | undefined, arg3: string | undefined) => {
      const workspaceRoot = findWorkspaceRoot();
      const { resolvedTaskDir, resolvedFile, taskLabel, contestId } = resolveArgs(workspaceRoot, arg1, arg2, arg3);

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

        if (res.status === 'AC') {
          p.log.success(`${pc.green(pc.bold('[AC]'))} ${label}: Passed (${duration})`);
        } else if (res.status === 'WA') {
          allPassed = false;
          p.log.error(`${pc.red(pc.bold('[WA]'))} ${label}: Failed (${duration})`);
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
          p.log.error(`${pc.red(pc.bold('[TLE]'))} ${label}: Time Limit Exceeded (${duration} vs Limit ${timeLimitMs} ms)`);
        } else if (res.status === 'RE') {
          allPassed = false;
          p.log.error(`${pc.red(pc.bold('[RE]'))} ${label}: Runtime Error (${duration})`);
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
    })
  );

program
  .command('submit [arg1] [arg2] [arg3]')
  .description(t('descSubmit', lang))
  .action(
    handleAction(async (arg1: string | undefined, arg2: string | undefined, arg3: string | undefined) => {
      const workspaceRoot = findWorkspaceRoot();
      const { resolvedTaskDir, resolvedFile, taskLabel, contestId } = resolveArgs(workspaceRoot, arg1, arg2, arg3);

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
    })
  );

program
  .command('lang [language]')
  .description(t('descLang', lang))
  .action(
    handleAction(async (targetLanguage: string | undefined) => {
      let workspaceRoot: string;
      try {
        workspaceRoot = findWorkspaceRoot();
      } catch {
        p.log.error(pc.red(t('langWorkspaceRequired', lang)));
        process.exit(1);
      }

      let selectedLang = targetLanguage;

      if (!selectedLang) {
        const choice = await p.select({
          message: t('langSelectMessage', lang),
          options: [
            { value: 'en', label: 'English (en)' },
            { value: 'ja', label: '日本語 (ja)' }
          ]
        });

        if (p.isCancel(choice)) {
          p.cancel(t('langCancelled', lang));
          process.exit(0);
        }

        selectedLang = choice as string;
      }

      const cleanLang = selectedLang.trim().toLowerCase();
      if (cleanLang !== 'en' && cleanLang !== 'ja') {
        p.log.error(pc.red(t('langInvalid', lang)));
        process.exit(1);
      }

      const config = loadConfig(workspaceRoot);
      config.lang = cleanLang as 'en' | 'ja';
      saveConfig(workspaceRoot, config);

      p.log.success(t('langSuccess', cleanLang as 'en' | 'ja', cleanLang));
    })
  );

program
  .command('add-lang [langName]')
  .description(t('descAddLang', lang))
  .action(
    handleAction(async (langName: string | undefined) => {
      const root = findWorkspaceRoot();
      const config = loadConfig(root);

      let targetLang = langName;
      if (!targetLang) {
        const availablePresets = Object.keys(LANGUAGE_PRESETS).filter(
          (key) => !config.languages[key]
        );

        const options = [
          ...availablePresets.map((key) => ({ value: key, label: key })),
          { value: 'other', label: t('addLangSelectOther', lang) }
        ];

        const selected = await p.select({
          message: t('addLangSelectName', lang),
          options
        }) as string;

        if (p.isCancel(selected)) {
          p.cancel(t('addLangCancelled', lang));
          process.exit(0);
        }

        if (selected === 'other') {
          targetLang = await p.text({
            message: t('addLangEnterName', lang),
            validate: (val) => (!val.trim() ? t('addLangNameNotEmpty', lang) : undefined)
          }) as string;

          if (p.isCancel(targetLang)) {
            p.cancel(t('addLangCancelled', lang));
            process.exit(0);
          }
        } else {
          targetLang = selected;
        }
      }

      targetLang = targetLang.trim().toLowerCase();

      // Check if already exists
      if (config.languages[targetLang]) {
        throw new AtcError(t('addLangAlreadyExists', lang, targetLang));
      }

      const preset = LANGUAGE_PRESETS[targetLang];
      let extension = '';
      let build = '';
      let run = '';
      let template = '';

      if (preset) {
        extension = preset.config.extension;
        build = preset.config.build;
        run = preset.config.run;
        template = preset.template;
      } else {
        // If not preset, prompt for parameters
        const extInput = await p.text({
          message: t('addLangEnterExtension', lang, targetLang),
          placeholder: targetLang,
          validate: (val) => (!val.trim() ? t('addLangExtNotEmpty', lang) : undefined)
        }) as string;

        if (p.isCancel(extInput)) {
          p.cancel(t('addLangCancelled', lang));
          process.exit(0);
        }

        const buildInput = await p.text({
          message: t('addLangEnterBuildCmd', lang),
          placeholder: 'e.g. g++ -O2 main.cpp (leave empty if not needed)'
        }) as string;

        if (p.isCancel(buildInput)) {
          p.cancel(t('addLangCancelled', lang));
          process.exit(0);
        }

        const runInput = await p.text({
          message: t('addLangEnterRunCmd', lang),
          placeholder: `e.g. python3 main.py or ./a.out`,
          validate: (val) => (!val.trim() ? t('addLangRunCmdNotEmpty', lang) : undefined)
        }) as string;

        if (p.isCancel(runInput)) {
          p.cancel(t('addLangCancelled', lang));
          process.exit(0);
        }

        extension = extInput.trim();
        build = buildInput.trim();
        run = runInput.trim();
        template = `// Solve the problem here\n`;
      }

      const s = p.spinner();
      s.start(t('addLangSpinner', lang));

      try {
        addLanguage(root, targetLang, {
          extension,
          build,
          run,
          template
        });
      } catch (e: any) {
        s.stop('Failed');
        throw e;
      }

      s.stop(t('addLangSuccess', lang, targetLang));
    })
  );

program
  .command('default-lang [langName]')
  .description(t('descDefaultLang', lang))
  .action(
    handleAction(async (langName: string | undefined) => {
      const root = findWorkspaceRoot();
      const config = loadConfig(root);

      let targetLang = langName;
      if (!targetLang) {
        const configuredLangs = Object.keys(config.languages);
        if (configuredLangs.length === 0) {
          p.log.error(pc.red('No languages configured in this workspace. Please run "atc init" or "atc add-lang".'));
          process.exit(1);
        }

        const choice = await p.select({
          message: t('defaultLangSelectMessage', lang),
          options: configuredLangs.map((l) => ({ value: l, label: l }))
        });

        if (p.isCancel(choice)) {
          p.cancel(t('defaultLangCancelled', lang));
          process.exit(0);
        }

        targetLang = choice as string;
      }

      targetLang = targetLang.trim().toLowerCase();

      if (!config.languages[targetLang]) {
        p.log.error(pc.red(t('defaultLangNotConfigured', lang, targetLang)));
        process.exit(1);
      }

      config.defaultLanguage = targetLang;
      saveConfig(root, config);

      p.log.success(t('defaultLangSuccess', lang, targetLang));
    })
  );

const toolsCmd = program
  .command('tools')
  .alias('t')
  .description(t('descTools', lang));

toolsCmd
  .command('bundle [files...]')
  .description(t('descBundle', lang))
  .option('-i, --input <files...>', 'Input files to bundle')
  .option('-o, --output <file>', 'Output bundle file')
  .action(
    handleAction(async (files: string[], options: { input?: string[]; output?: string }) => {
      let inputs: string[] = [];
      let output: string | undefined = options.output;

      const doubleDashIndex = process.argv.indexOf('--');
      let extraArgs: string[] = [];
      if (doubleDashIndex !== -1) {
        extraArgs = process.argv.slice(doubleDashIndex + 1);
        files = files.filter(f => {
          const idx = process.argv.indexOf(f);
          return idx !== -1 && idx < doubleDashIndex;
        });
      }

      if (options.input && options.input.length > 0) {
        inputs = options.input;
      }

      if (inputs.length === 0) {
        if (files.length > 0) {
          if (output) {
            inputs = files;
          } else {
            if (files.length === 1) {
              inputs = [files[0]];
            } else {
              inputs = files.slice(0, -1);
              output = files[files.length - 1];
            }
          }
        }
      } else {
        if (files.length > 0) {
          inputs = [...inputs, ...files];
        }
      }

      if (inputs.length === 0) {
        p.log.error(pc.red('Please specify at least one input file.'));
        process.exit(1);
      }

      if (!output) {
        const firstInput = inputs[0];
        const ext = path.extname(firstInput);
        const dir = path.dirname(firstInput);
        const base = path.basename(firstInput, ext);
        output = path.join(dir, `${base}.bundle${ext}`);
      }

      const s = p.spinner();
      s.start('Bundling files...');

      try {
        bundleFiles(inputs, output, workspaceRoot, extraArgs);
        s.stop(t('bundleSuccess', lang, output));
      } catch (err: any) {
        s.stop('Failed');
        throw err;
      }
    })
  );

toolsCmd
  .command('doctor [languages...]')
  .description(t('descDoctor' as any, lang))
  .option('--refresh', 'Refresh the AtCoder compiler version cache')
  .option('--yes', 'Run in non-interactive mode and exit with code 1 if mismatch found')
  .action(
    handleAction(async (languages: string[], options: { refresh?: boolean; yes?: boolean }) => {
      await runDoctor({
        languages: languages.length > 0 ? languages : undefined,
        refresh: options.refresh,
        yes: options.yes
      });
    })
  );

toolsCmd
  .command('setup [languages...]')
  .description(t('descSetup' as any, lang))
  .option('--refresh', 'Refresh the AtCoder compiler version cache')
  .option('--dry-run', 'Show setup commands and diffs without running them')
  .option('--yes', 'Skip all prompts and use default choices')
  .action(
    handleAction(async (languages: string[], options: { refresh?: boolean; dryRun?: boolean; yes?: boolean }) => {
      await runSetup({
        languages: languages.length > 0 ? languages : undefined,
        refresh: options.refresh,
        dryRun: options.dryRun,
        yes: options.yes
      });
    })
  );

program.parse(process.argv);

