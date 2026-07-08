#!/usr/bin/env node

import pkg from "../package.json"

import { Command } from 'commander';
import pc from 'picocolors';

import { findWorkspaceRoot } from './workspace/finder';
import { getLocale, t, h } from './utils/i18n';
import { WorkspaceNotFoundError } from './utils/errors';

// Import command handlers
import { handleInit } from './commands/init';
import { handleLogin } from './commands/login';
import { handleLogout } from './commands/logout';
import { handleWhoami } from './commands/whoami';
import { handleNew } from './commands/new';
import { handleOpen } from './commands/open';
import { handleTest } from './commands/test';
import { handlePlay } from './commands/play';
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
const locale = getLocale(workspaceRoot);

const program = new Command();

program
  .name('atc')
  .description('AtCoder Next')
  .version(pkg.version)
  .option('--debug', t('cliDebugDesc', locale))
  .option('-y, --yes', t('cliYesDesc', locale));

function handleAction(fn: (...args: any[]) => Promise<void>) {
  return async (...args: any[]) => {
    // Map global --yes option to an environment variable for command handlers to read
    if (program.opts().yes) {
      process.env.ATC_YES = 'true';
    }
    try {
      await fn(...args);
    } catch (err: any) {
      let errMsg = err.message || t('cliUnexpectedError', locale);
      if (err instanceof WorkspaceNotFoundError) {
        errMsg = t('workspaceNotFound', locale);
      } else if (err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT' || errMsg.includes('timeout')) {
        errMsg = locale === 'ja'
          ? 'ネットワーク接続に失敗しました。インターネット接続状況、または AtCoder サーバーの稼働状態を確認してください。'
          : 'Network connection failed. Please check your internet connection or AtCoder server status.';
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
  .command('init [dir]')
  .description(h('descInit'))
  .action(handleAction(handleInit));

program
  .command('login')
  .description(h('descLogin'))
  .action(handleAction(handleLogin));

program
  .command('logout')
  .description(h('descLogout'))
  .action(handleAction(handleLogout));

program
  .command('whoami')
  .description(h('descWhoami'))
  .action(handleAction(handleWhoami));

program
  .command('new <contest> [task]')
  .description(h('descNew'))
  .option('-a, --all', t('cliNewAllDesc', locale))
  .action(handleAction(handleNew));

program
  .command('open [contestId] [taskLabel]')
  .description(h('descOpen'))
  .action(handleAction(handleOpen));

program
  .command('test [contestIdOrTask] [taskLabel]')
  .alias('t')
  .description(h('descTest'))
  .option('-f, --file <file>', t('cliTestFileDesc', locale))
  .action(handleAction(handleTest));

program
  .command('play [contestIdOrTask] [taskLabel]')
  .alias('p')
  .description(h('descPlay'))
  .option('-f, --file <file>', t('cliPlayFileDesc', locale))
  .action(handleAction(handlePlay));

program
  .command('submit [contestIdOrTask] [taskLabel]')
  .alias('s')
  .description(h('descSubmit'))
  .option('-f, --file <file>', t('cliSubmitFileDesc', locale))
  .action(handleAction(handleSubmit));

program
  .command('lang [langName]')
  .description(h('descLang'))
  .action(handleAction(handleLang));

const languageCmd = program
  .command('language')
  .alias('l')
  .description(t('cliLanguageCmdDesc', locale));

languageCmd
  .command('add [langName]')
  .description(h('descAddLang'))
  .action(handleAction(handleAddLang));

languageCmd
  .command('default [langName]')
  .description(h('descDefaultLang'))
  .action(handleAction(handleDefaultLang));

const toolsCmd = program
  .command('tools')
  .alias('tl')
  .description(h('descTools'));

toolsCmd
  .command('bundle <entryFile>')
  .description(h('descBundle'))
  .option('-o, --output <file>', t('cliBundleOutputDesc', locale))
  .addHelpText('after', `
Examples:
  $ atc tools bundle main.cpp -o bundle.cpp
  $ atc tl bundle src/main.rs -o bundle.rs
  $ atc tl bundle index.ts -o dist/bundle.js --minify

Note:
  - The output path must be within the workspace root directory.
  - Files outside the workspace root cannot be bundled.
  `)
  .action(handleAction(handleBundle));

toolsCmd
  .command('doctor [languages...]')
  .description(h('descDoctor' as any))
  .option('--refresh', t('cliRefreshDesc', locale))
  .option('--yes', t('cliDoctorYesDesc', locale))
  .action(handleAction(handleDoctor));

toolsCmd
  .command('setup [languages...]')
  .description(h('descSetup' as any))
  .option('--refresh', t('cliRefreshDesc', locale))
  .option('--dry-run', t('cliSetupDryRunDesc', locale))
  .option('--yes', t('cliSetupYesDesc', locale))
  .action(handleAction(handleSetup));

program.parse(process.argv);
