#!/usr/bin/env node

import pkg from "../package.json"

import { Command } from 'commander';
import pc from 'picocolors';

import { findWorkspaceRoot } from './workspace/finder';
import { getLanguage, t } from './utils/i18n';
import { WorkspaceNotFoundError } from './utils/errors';

// Import command handlers
import { handleInit } from './commands/init';
import { handleLogin } from './commands/login';
import { handleLogout } from './commands/logout';
import { handleWhoami } from './commands/whoami';
import { handleNew } from './commands/new';
import { handleOpen } from './commands/open';
import { handleTest } from './commands/test';
import { handleSubmit } from './commands/submit';
import { handleLang, handleAddLang, handleDefaultLang } from './commands/language';
import { handleBundle } from './commands/tools';
import { handleDoctor, handleSetup } from './commands/doctor';

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
  .version(pkg.version)
  .option('--debug', 'Enable debug output and stack trace');

function handleAction(fn: (...args: any[]) => Promise<void>) {
  return async (...args: any[]) => {
    try {
      await fn(...args);
    } catch (err: any) {
      let errMsg = err.message || 'An unexpected error occurred.';
      if (err instanceof WorkspaceNotFoundError) {
        errMsg = t('workspaceNotFound', lang);
      }
      console.error(pc.red(errMsg));
      
      const debugMode = program.opts().debug || process.env.ATC_DEBUG || process.env.NODE_ENV === 'development';
      if (debugMode && err.stack) {
        console.error(pc.gray(err.stack));
      }
      process.exit(1);
    }
  };
}

program
  .command('init')
  .description(t('descInit', lang))
  .action(handleAction(handleInit));

program
  .command('login')
  .description(t('descLogin', lang))
  .action(handleAction(handleLogin));

program
  .command('logout')
  .description(t('descLogout', lang))
  .action(handleAction(handleLogout));

program
  .command('whoami')
  .description(t('descWhoami', lang))
  .action(handleAction(handleWhoami));

program
  .command('new <contest> [task]')
  .description(t('descNew', lang))
  .option('-a, --all', 'Download all tasks for the contest')
  .action(handleAction(handleNew));

program
  .command('open [contestId] [taskLabel]')
  .description(t('descOpen', lang))
  .action(handleAction(handleOpen));

program
  .command('test [contestIdOrTask] [taskLabel]')
  .description(t('descTest', lang))
  .option('-f, --file <file>', 'Specify the source file to test')
  .action(handleAction(handleTest));

program
  .command('submit [contestIdOrTask] [taskLabel]')
  .description(t('descSubmit', lang))
  .option('-f, --file <file>', 'Specify the source file to submit')
  .action(handleAction(handleSubmit));

program
  .command('lang [langName]')
  .description(t('descLang', lang))
  .action(handleAction(handleLang));

program
  .command('add-lang [langName]')
  .description(t('descAddLang', lang))
  .action(handleAction(handleAddLang));

program
  .command('default-lang [langName]')
  .description(t('descDefaultLang', lang))
  .action(handleAction(handleDefaultLang));

const toolsCmd = program
  .command('tools')
  .alias('t')
  .description(t('descTools', lang));

toolsCmd
  .command('bundle <entryFile>')
  .description(t('descBundle', lang))
  .option('-o, --output <file>', 'Output bundle file')
  .action(handleAction(handleBundle));

toolsCmd
  .command('doctor [languages...]')
  .description(t('descDoctor' as any, lang))
  .option('--refresh', 'Refresh the AtCoder compiler version cache')
  .option('--yes', 'Run in non-interactive mode and exit with code 1 if mismatch found')
  .action(handleAction(handleDoctor));

toolsCmd
  .command('setup [languages...]')
  .description(t('descSetup' as any, lang))
  .option('--refresh', 'Refresh the AtCoder compiler version cache')
  .option('--dry-run', 'Show setup commands and diffs without running them')
  .option('--yes', 'Skip all prompts and use default choices')
  .action(handleAction(handleSetup));

program.parse(process.argv);
