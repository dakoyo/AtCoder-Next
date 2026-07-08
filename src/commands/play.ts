import * as p from '@clack/prompts';
import pc from 'picocolors';
import { spawn } from 'child_process';
import { findWorkspaceRoot } from '../workspace/finder';
import { getLocale, t } from '../utils/i18n';
import { resolveArgs } from './utils';
import { loadConfig } from '../config';
import { detectCodeFile, resolveCommands, runBuild, parseCommandString, resolveSpawnCommand } from '../test-runner/runner';

export async function handlePlay(
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

  p.intro(pc.cyan(t('playIntro', locale, contestId, taskLabel)));

  const config = loadConfig(workspaceRoot);
  const { codeFile, langConfig } = detectCodeFile(workspaceRoot, resolvedTaskDir, config, resolvedFile);
  const { build, run } = resolveCommands(workspaceRoot, langConfig, codeFile, langConfig.extension);

  if (build.trim() !== '') {
    const buildSpinner = p.spinner();
    buildSpinner.start(t('playCompiling', locale));
    const buildRes = await runBuild(build, resolvedTaskDir);
    if (buildRes.code !== 0) {
      buildSpinner.stop(pc.red(t('playCompilationFailed', locale)));
      console.error(pc.red(`\n${t('testHeaderCompileError', locale)}`));
      console.error(buildRes.stderr.trim());
      console.error(pc.red(`${t('testBorder', locale)}\n`));
      process.exit(1);
    }
    buildSpinner.stop(t('playCompiled', locale));
  }

  const { command, args } = parseCommandString(run);
  const resolvedCommand = resolveSpawnCommand(command, resolvedTaskDir);

  console.log(pc.gray(t('playRunningPrompt', locale)));
  console.log(pc.cyan('───────────────────────────────────────────────────────────────────'));

  const child = spawn(resolvedCommand, args, {
    cwd: resolvedTaskDir,
    stdio: 'inherit',
    shell: false
  });

  child.on('error', (err) => {
    console.log(pc.cyan('───────────────────────────────────────────────────────────────────'));
    console.error(pc.red(t('playRunningFailed', locale, err.message)));
    process.exit(1);
  });

  child.on('exit', (code, signal) => {
    console.log(pc.cyan('───────────────────────────────────────────────────────────────────'));
    if (signal) {
      p.outro(pc.yellow(t('playTerminatedSignal', locale, signal)));
      process.exit(1);
    } else if (code !== 0) {
      p.outro(pc.red(t('playExitedCode', locale, code ?? 1)));
      process.exit(code ?? 1);
    } else {
      p.outro(pc.green(t('playFinished', locale)));
      process.exit(0);
    }
  });
}
