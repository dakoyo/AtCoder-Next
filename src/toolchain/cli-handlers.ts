import * as p from '@clack/prompts';
import pc from 'picocolors';
import * as fs from 'fs';
import * as path from 'path';
import {
  detectOS,
  detectPackageManagers,
  detectLocalVersion,
  commandExists,
  toolchainDefinitions,
  getToolchainForLanguage,
  resolveInstallPlan,
  ResolvedInstallPlan,
  InstallStep,
  runInstallCommand,
  appendToInstallLog
} from './index';
import { getAtCoderCompilers, findAtCoderTarget } from './atcoder-compilers';
import { loadConfig, saveConfig, Config, LanguageConfig, getGlobalConfigDir } from '../config';
import { findWorkspaceRoot } from '../workspace/finder';
import { t } from '../utils/i18n';

// Helper to assert cancellation
function assertNotCancelled<T>(value: T | symbol): T {
  if (p.isCancel(value)) {
    p.cancel("操作をキャンセルしました。変更は行われていません。");
    process.exit(0);
  }
  return value;
}

function printCustomBlock(title: string, content: string): void {
  const lines = content.split('\n');
  console.log(pc.cyan(`┌  ${title}`));
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === '' && i === lines.length - 1) {
      continue;
    }
    console.log(`${pc.cyan('│')}  ${line}`);
  }
  console.log(pc.cyan('└───────────────────────────────────────────────────'));
}

export function detectToolchainVersion(
  toolchain: typeof toolchainDefinitions[keyof typeof toolchainDefinitions],
  langId: string,
  targetVersion?: string
): string | undefined {
  let detectCmd = toolchain.detect.command;
  let customRegex = toolchain.detect.versionRegex;

  if (toolchain.id === 'gcc') {
    const base = langId === 'c' ? 'gcc' : 'g++';
    customRegex = /(?:g\+\+|gcc).*?(\d+\.\d+\.\d+)/i;

    const candidates: string[] = [];
    if (targetVersion) {
      const major = targetVersion.split('.')[0];
      candidates.push(`${base}-${major}`);
    }
    for (let m = 16; m >= 9; m--) {
      candidates.push(`${base}-${m}`);
    }
    candidates.push(base);

    for (const cmd of candidates) {
      if (commandExists(cmd)) {
        detectCmd = `${cmd} --version`;
        break;
      }
    }
  } else if (toolchain.id === 'clang') {
    const base = langId === 'c' ? 'clang' : 'clang++';
    const candidates: string[] = [];
    if (targetVersion) {
      const major = targetVersion.split('.')[0];
      candidates.push(`${base}-${major}`);
      candidates.push(`clang-${major}`);
    }
    for (let m = 22; m >= 10; m--) {
      candidates.push(`${base}-${m}`);
      candidates.push(`clang-${m}`);
    }
    candidates.push(base);
    candidates.push('clang');

    for (const cmd of candidates) {
      if (commandExists(cmd)) {
        detectCmd = `${cmd} --version`;
        break;
      }
    }
  }

  return detectLocalVersion(detectCmd, customRegex);
}

export function getToolchainForLang(langId: string, config?: Config): typeof toolchainDefinitions[keyof typeof toolchainDefinitions] | undefined {
  const id = getToolchainIdForLang(langId, config);
  return id ? toolchainDefinitions[id] : undefined;
}

export function getToolchainsForLang(langId: string): (typeof toolchainDefinitions[keyof typeof toolchainDefinitions])[] {
  if (langId === 'cpp' || langId === 'c') {
    return [toolchainDefinitions.gcc, toolchainDefinitions.clang];
  }
  if (langId === 'python') {
    return [toolchainDefinitions.python, toolchainDefinitions.pypy];
  }
  if (langId === 'rust') {
    return [toolchainDefinitions.rust];
  }
  if (langId === 'typescript') {
    return [toolchainDefinitions.typescript];
  }
  if (langId === 'javascript') {
    return [toolchainDefinitions.node];
  }
  return [];
}

function getToolchainIdForLang(langId: string, config?: Config): string | undefined {
  if (langId === 'cpp' || langId === 'c') {
    const buildCmd = config?.languages[langId]?.build || '';
    if (buildCmd.toLowerCase().includes('clang')) {
      return 'clang';
    }
    return 'gcc';
  }
  if (langId === 'python') {
    return 'python';
  }
  if (langId === 'rust') {
    return 'rust';
  }
  if (langId === 'typescript') {
    return 'typescript';
  }
  if (langId === 'javascript') {
    return 'node';
  }
  return undefined;
}

export function compareVersions(local: string, target: string): 'match' | 'warning' | 'mismatch' {
  const localParts = local.split('.');
  const targetParts = target.split('.');
  const localMajor = localParts[0];
  const targetMajor = targetParts[0];
  const localMinor = localParts[1];
  const targetMinor = targetParts[1];

  if (localMajor === targetMajor) {
    return 'match';
  }
  if (localMajor !== targetMajor && localMinor === targetMinor) {
    return 'warning';
  }
  return 'mismatch';
}

function generateDiff(oldConfig: any, newConfig: any): string {
  let diff = '';
  for (const key of Object.keys(newConfig)) {
    if (JSON.stringify(oldConfig[key]) !== JSON.stringify(newConfig[key])) {
      diff += pc.red(`- "${key}": ${JSON.stringify(oldConfig[key])}\n`);
      diff += pc.green(`+ "${key}": ${JSON.stringify(newConfig[key])}\n`);
    }
  }
  return diff;
}

export async function runDoctor(options: { languages?: string[]; refresh?: boolean; yes?: boolean } = {}) {
  const workspaceRoot = findWorkspaceRoot();
  const config = loadConfig(workspaceRoot);
  const displayLang = config.lang || 'en';

  p.intro(pc.cyan(t('doctorIntro' as any, displayLang)));

  const s = p.spinner();
  s.start(t('doctorSpinnerDetecting' as any, displayLang));
  
  const os = detectOS();
  
  s.message(t('doctorSpinnerFetchingCompilers' as any, displayLang));
  let compilers;
  try {
    compilers = await getAtCoderCompilers(workspaceRoot, options.refresh);
  } catch (err: any) {
    s.stop(t('doctorFetchFailed' as any, displayLang));
    p.log.error(pc.red(err.message));
    p.outro(pc.red(t('doctorOutroFailed' as any, displayLang)));
    if (options.yes) {
      process.exit(1);
    }
    return;
  }
  
  s.stop(t('doctorDetectDone' as any, displayLang));

  const configuredLangs = options.languages || Object.keys(config.languages);
  if (configuredLangs.length === 0) {
    p.log.error(pc.red(t('doctorNoLanguagesConfigured' as any, displayLang)));
    process.exit(1);
  }

  let selection: string[];
  if (options.yes) {
    selection = configuredLangs;
  } else {
    selection = assertNotCancelled(
      await p.multiselect({
        message: t('doctorSelectLanguages' as any, displayLang),
        options: configuredLangs.map(langId => ({
          value: langId,
          label: `${langId} (${config.languages[langId].extension})`
        })),
        initialValues: configuredLangs
      })
    ) as string[];
  }

  const results: {
    langId: string;
    toolchainName: string;
    localVersion: string;
    targetVersion: string;
    targetName: string;
    status: 'match' | 'warning' | 'mismatch' | 'optional-missing';
  }[] = [];

  const checkSpinner = p.spinner();
  checkSpinner.start(t('doctorCheckingVersions' as any, displayLang));

  for (const langId of selection) {
    const toolchains = getToolchainsForLang(langId);
    const activeToolchainId = getToolchainIdForLang(langId, config);
    
    for (const toolchain of toolchains) {
      const target = findAtCoderTarget(toolchain.id, langId, compilers);
      const localVer = detectToolchainVersion(toolchain, langId, target?.version);
      const isActive = toolchain.id === activeToolchainId;
      
      let status: 'match' | 'warning' | 'mismatch' | 'optional-missing';
      if (!localVer) {
        status = isActive ? 'mismatch' : 'optional-missing';
      } else if (target) {
        status = compareVersions(localVer, target.version);
      } else {
        status = 'mismatch';
      }
      
      if (target) {
        results.push({
          langId,
          toolchainName: toolchain.displayName,
          localVersion: localVer || 'Not Found',
          targetVersion: target.version,
          targetName: target.name,
          status
        });
      } else {
        results.push({
          langId,
          toolchainName: toolchain.displayName,
          localVersion: localVer || 'Not Found',
          targetVersion: 'Unknown',
          targetName: 'Unknown',
          status
        });
      }
    }
  }

  checkSpinner.stop(t('doctorCheckDone' as any, displayLang));

  let tableContent = '';
  const colWidths = { lang: 10, tool: 12, local: 16, target: 20, status: 12 };
  
  const headerRow = 
    'Language'.padEnd(colWidths.lang) + 
    'Compiler'.padEnd(colWidths.tool) + 
    'Local Version'.padEnd(colWidths.local) + 
    'AtCoder Version'.padEnd(colWidths.target) + 
    'Status';
  tableContent += pc.bold(headerRow) + '\n';
  tableContent += '-'.repeat(colWidths.lang + colWidths.tool + colWidths.local + colWidths.target + colWidths.status) + '\n';

  for (const r of results) {
    let statusStr = '';
    if (r.status === 'match') {
      statusStr = pc.green('Match');
    } else if (r.status === 'warning') {
      statusStr = pc.yellow('Warning');
    } else if (r.status === 'optional-missing') {
      statusStr = pc.gray('Not Installed');
    } else {
      statusStr = pc.red(r.localVersion === 'Not Found' ? 'Not Installed' : 'Mismatch');
    }
    
    const row = 
      r.langId.padEnd(colWidths.lang) + 
      r.toolchainName.padEnd(colWidths.tool) + 
      r.localVersion.padEnd(colWidths.local) + 
      r.targetVersion.padEnd(colWidths.target) + 
      statusStr;
    tableContent += row + '\n';
  }

  printCustomBlock(t('doctorResultsTitle' as any, displayLang), tableContent);

  if (options.yes) {
    p.outro(pc.green(t('doctorFinished' as any, displayLang)));
    const hasMismatch = results.some(r => r.status === 'mismatch');
    if (hasMismatch) {
      process.exit(1);
    }
    process.exit(0);
  }

  const nextAction = assertNotCancelled(
    await p.select({
      message: t('doctorNextActionMessage' as any, displayLang),
      options: [
        { value: 'setup', label: t('doctorNextActionSetup' as any, displayLang) },
        { value: 'exit', label: t('doctorNextActionExit' as any, displayLang) }
      ],
      initialValue: 'setup'
    })
  ) as string;

  if (nextAction === 'setup') {
    const targetLangs = Array.from(new Set(results.filter(r => r.status !== 'match').map(r => r.langId)));
    if (targetLangs.length === 0) {
      const allConfirm = assertNotCancelled(
        await p.confirm({
          message: t('doctorSetupAllConfirm' as any, displayLang),
          initialValue: false
        })
      );
      if (allConfirm) {
        await runSetup({ languages: Array.from(new Set(results.map(r => r.langId))), displayLangFromDoctor: displayLang });
      } else {
        p.outro(pc.green(t('doctorFinishedNoChanges' as any, displayLang)));
      }
    } else {
      await runSetup({ languages: targetLangs, displayLangFromDoctor: displayLang });
    }
  } else {
    p.outro(pc.green(t('doctorFinished' as any, displayLang)));
  }
}

export interface SetupOptions {
  languages?: string[];
  refresh?: boolean;
  dryRun?: boolean;
  displayLangFromDoctor?: 'en' | 'ja';
  yes?: boolean;
}

export async function runSetup(options: SetupOptions = {}) {
  const workspaceRoot = findWorkspaceRoot();
  const config = loadConfig(workspaceRoot);
  const displayLang = options.displayLangFromDoctor || config.lang || 'en';

  p.intro(pc.cyan(t('setupIntro' as any, displayLang)));

  const os = detectOS();

  const s = p.spinner();
  s.start(t('setupSpinnerFetchingCompilers' as any, displayLang));
  let compilers;
  try {
    compilers = await getAtCoderCompilers(workspaceRoot, options.refresh);
  } catch (err: any) {
    s.stop(t('setupFetchFailed' as any, displayLang));
    p.log.error(pc.red(err.message));
    p.outro(pc.red(t('setupOutroFailed' as any, displayLang)));
    if (options.yes) {
      process.exit(1);
    }
    return;
  }
  s.stop(t('setupDetectDone' as any, displayLang));

  let targetLangs = options.languages || [];
  if (targetLangs.length === 0) {
    const configuredLangs = Object.keys(config.languages);
    if (configuredLangs.length === 0) {
      p.log.error(pc.red(t('setupNoLanguagesConfigured' as any, displayLang)));
      process.exit(1);
    }
    if (options.yes) {
      targetLangs = configuredLangs;
    } else {
      targetLangs = assertNotCancelled(
        await p.multiselect({
          message: t('setupSelectLanguages' as any, displayLang),
          options: configuredLangs.map(langId => ({
            value: langId,
            label: `${langId} (${config.languages[langId].extension})`
          })),
          initialValues: configuredLangs
        })
      ) as string[];
    }
  }

  const allSteps: { langId: string; step: InstallStep }[] = [];
  const settingsUpdates: { langId: string; oldConfig: LanguageConfig; newConfig: LanguageConfig }[] = [];
  let requiresSudo = false;
  const uninstallHints: string[] = [];

  for (const langId of targetLangs) {
    let toolchain = getToolchainForLang(langId, config);
    if (langId === 'cpp' || langId === 'c') {
      const currentId = toolchain?.id || 'gcc';
      const choice = options.yes ? currentId : assertNotCancelled(
        await p.select({
          message: t('selectCompiler' as any, displayLang, langId),
          options: [
            { value: 'gcc', label: `GCC (${currentId === 'gcc' ? 'current' : 'switch to'})` },
            { value: 'clang', label: `Clang (${currentId === 'clang' ? 'current' : 'switch to'})` }
          ],
          initialValue: currentId
        })
      ) as string;
      toolchain = toolchainDefinitions[choice];
    } else if (langId === 'python') {
      const currentId = toolchain?.id || 'python';
      const choice = options.yes ? currentId : assertNotCancelled(
        await p.select({
          message: t('selectRuntime' as any, displayLang, langId),
          options: [
            { value: 'python', label: `CPython (${currentId === 'python' ? 'current' : 'switch to'})` },
            { value: 'pypy', label: `PyPy (${currentId === 'pypy' ? 'current' : 'switch to'})` }
          ],
          initialValue: currentId
        })
      ) as string;
      toolchain = toolchainDefinitions[choice];
    }

    if (!toolchain) {
      p.log.warn(`No toolchain definition found for language "${langId}". Skipping.`);
      continue;
    }

    const target = findAtCoderTarget(toolchain.id, langId, compilers);
    
    if (!target) {
      p.log.warn(`Could not find target compiler on AtCoder for language "${langId}". Skipping.`);
      continue;
    }

    const localVer = detectToolchainVersion(toolchain, langId, target.version);

    const status = localVer ? compareVersions(localVer, target.version) : 'mismatch';
    
    if (status === 'match') {
      if (options.yes) {
        p.log.info(`[${langId}] Already matches AtCoder version: ${localVer}. Skipping setup.`);
        continue;
      }
      const proceed = assertNotCancelled(
        await p.confirm({
          message: t('setupAlreadyMatchesConfirm' as any, displayLang, langId, localVer),
          initialValue: false
        })
      );
      if (!proceed) {
        continue;
      }
    }

    const plans = await resolveInstallPlan(toolchain, target.version, os);
    if (plans.length === 0) {
      p.log.error(t('setupNoInstallMethods' as any, displayLang, toolchain.displayName, os));
      continue;
    }

    let selectedPlan: ResolvedInstallPlan;
    if (plans.length === 1) {
      selectedPlan = plans[0];
    } else {
      if (options.yes) {
        selectedPlan = plans[0];
      } else {
        const choices = plans.map((p, idx) => ({
          value: idx.toString(),
          label: p.strategy === 'version-manager' 
            ? `Version Manager (${toolchain.versionManager?.id}) - Recommended` 
            : `Package Manager (${p.steps[0]?.command.split(' ')[0] || 'OS' })`
        }));
        choices.push({ value: 'skip', label: 'Skip installation' });

        const choice = assertNotCancelled(
          await p.select({
            message: t('setupSelectStrategy' as any, displayLang, langId, target.version),
            options: choices,
            initialValue: '0'
          })
        ) as string;

        if (choice === 'skip') {
          continue;
        }
        selectedPlan = plans[parseInt(choice, 10)];
      }
    }

    for (const step of selectedPlan.steps) {
      allSteps.push({ langId, step });
    }
    if (selectedPlan.requiresElevatedPrivileges) {
      requiresSudo = true;
    }
    for (const hint of selectedPlan.uninstallHint) {
      uninstallHints.push(hint.command);
    }

    const oldLangConfig = config.languages[langId];
    if (oldLangConfig) {
      const newLangConfig = { ...oldLangConfig };
      newLangConfig.atcoderLanguage = target.name;
      
      let newBuild = oldLangConfig.build;
      let newRun = oldLangConfig.run;

      if (toolchain.id === 'gcc') {
        newBuild = newBuild.replace(/\bclang\+\+(-\d+)?\b/g, 'g++')
                           .replace(/\bclang(-\d+)?\b/g, 'gcc');
      } else if (toolchain.id === 'clang') {
        newBuild = newBuild.replace(/\bg\+\+(-\d+)?\b/g, 'clang++')
                           .replace(/\bgcc(-\d+)?\b/g, 'clang');
      } else if (toolchain.id === 'python') {
        newRun = newRun.replace(/\bpypy3?\b/g, 'python3');
      } else if (toolchain.id === 'pypy') {
        newRun = newRun.replace(/\bpython3?\b/g, 'pypy3');
      }

      if (selectedPlan.strategy === 'package-manager') {
        const major = target.version.split('.')[0];
        if (toolchain.id === 'gcc') {
          newBuild = newBuild
            .replace(/\bg\+\+(-\d+)?\b/g, `g++-${major}`)
            .replace(/\bgcc(-\d+)?\b/g, `gcc-${major}`);
        } else if (toolchain.id === 'clang') {
          newBuild = newBuild
            .replace(/\bclang\+\+(-\d+)?\b/g, `clang++-${major}`)
            .replace(/\bclang(-\d+)?\b/g, `clang-${major}`);
        }
      }
      
      newLangConfig.build = newBuild;
      newLangConfig.run = newRun;
      
      settingsUpdates.push({
        langId,
        oldConfig: oldLangConfig,
        newConfig: newLangConfig
      });
    }
  }

  if (allSteps.length === 0 && settingsUpdates.length === 0) {
    p.outro(pc.green(t('setupNoWorkNeeded' as any, displayLang)));
    return;
  }

  let confirmNote = '';
  
  if (allSteps.length > 0) {
    confirmNote += pc.bold('Commands to run:') + '\n';
    for (const item of allSteps) {
      confirmNote += `  [${item.langId}] ${pc.cyan(item.step.command)}`;
      if (item.step.description) {
        confirmNote += ` (${item.step.description})`;
      }
      confirmNote += '\n';
    }
    confirmNote += '\n';
  }

  if (settingsUpdates.length > 0) {
    confirmNote += pc.bold('Configuration (settings.json) changes:') + '\n';
    for (const update of settingsUpdates) {
      confirmNote += `  [${update.langId}]:\n`;
      const diff = generateDiff(update.oldConfig, update.newConfig);
      confirmNote += diff.split('\n').map(l => '    ' + l).join('\n') + '\n';
    }
  }

  if (requiresSudo) {
    confirmNote += pc.bold(pc.red('⚠️ WARNING: Some commands require elevated privileges (sudo).')) + '\n';
  }

  printCustomBlock(t('setupExecutionPlanTitle' as any, displayLang), confirmNote);

  if (options.dryRun) {
    p.outro(pc.yellow(t('setupDryRunComplete' as any, displayLang)));
    return;
  }

  const proceed = options.yes ? true : assertNotCancelled(
    await p.confirm({
      message: t('setupProceedConfirm' as any, displayLang),
      initialValue: !requiresSudo
    })
  );

  if (!proceed) {
    p.cancel(t('setupAborted' as any, displayLang));
    process.exit(0);
  }

  let anyFailure = false;
  let executedAnyCommand = false;

  if (allSteps.length > 0) {
    for (let i = 0; i < allSteps.length; i++) {
      const { langId, step } = allSteps[i];
      p.log.step(t('setupExecutingCommand' as any, displayLang, i + 1, allSteps.length, langId, step.command));
      
      let res = await runInstallCommand(step.command);
      executedAnyCommand = true;
      appendToInstallLog(langId, step.command, res.success, res.output);
      
      let failed = !res.success;
      if (failed && options.yes) {
        p.log.error(t('setupCommandFailed' as any, displayLang, step.command));
        anyFailure = true;
      }

      while (failed && !options.yes) {
        p.log.error(t('setupCommandFailed' as any, displayLang, step.command));
        
        const action = await p.select({
          message: t('setupCommandFailedSelect' as any, displayLang),
          options: [
            { value: 'retry', label: t('setupCommandActionRetry' as any, displayLang) },
            { value: 'skip', label: t('setupCommandActionSkip' as any, displayLang) },
            { value: 'abort', label: t('setupCommandActionAbort' as any, displayLang) }
          ],
          initialValue: 'retry'
        });

        if (p.isCancel(action) || action === 'abort') {
          anyFailure = true;
          break;
        }

        if (action === 'skip') {
          p.log.warn(`Skipped command: ${step.command}`);
          failed = false;
          break;
        }

        p.log.step(t('setupExecutingCommand' as any, displayLang, i + 1, allSteps.length, langId, step.command));
        res = await runInstallCommand(step.command);
        appendToInstallLog(langId, step.command, res.success, res.output);
        failed = !res.success;
      }
      
      if (anyFailure) {
        p.cancel(t('setupAbortedHalfway' as any, displayLang));
        process.exit(options.yes ? 1 : 0);
      }
    }
    
    if (!anyFailure) {
      p.log.success(t('setupExecutionComplete' as any, displayLang));
    }
  }

  if (!anyFailure && settingsUpdates.length > 0) {
    const applyConfigVal = options.yes ? true : await p.confirm({
      message: t('setupApplyConfigConfirm' as any, displayLang),
      initialValue: true
    });

    if (!options.yes && p.isCancel(applyConfigVal)) {
      if (executedAnyCommand) {
        p.cancel(t('setupCancelledSettingsNotApplied' as any, displayLang));
      } else {
        p.cancel(t('setupAborted' as any, displayLang));
      }
      process.exit(0);
    }

    if (applyConfigVal) {
      for (const update of settingsUpdates) {
        config.languages[update.langId] = update.newConfig;
      }
      saveConfig(workspaceRoot, config);
      p.log.success(t('setupConfigAppliedSuccess' as any, displayLang));
    }
  }

  const installLogPath = path.join(getGlobalConfigDir(), 'install.log');
  let outroMsg = t('setupOutroSuccess' as any, displayLang, installLogPath);
  
  if (uninstallHints.length > 0) {
    outroMsg += '\n\n' + pc.bold('Uninstall commands (for reference):') + '\n';
    for (const hint of uninstallHints) {
      outroMsg += `  ${pc.gray(hint)}\n`;
    }
  }

  p.outro(pc.green(outroMsg));
}
