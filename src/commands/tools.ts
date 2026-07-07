import * as p from '@clack/prompts';
import * as path from 'path';
import { findWorkspaceRoot } from '../workspace/finder';
import { getLocale, t } from '../utils/i18n';
import { bundleFiles } from '../utils/bundler';

export async function handleBundle(entryFile: string, options: { output?: string }) {
  const workspaceRoot = findWorkspaceRoot();
  const locale = getLocale(workspaceRoot);

  let inputs: string[] = [entryFile];
  let output: string | undefined = options.output;

  const doubleDashIndex = process.argv.indexOf('--');
  let extraArgs: string[] = [];
  if (doubleDashIndex !== -1) {
    extraArgs = process.argv.slice(doubleDashIndex + 1);
  }

  if (!output) {
    const ext = path.extname(entryFile);
    const dir = path.dirname(entryFile);
    const base = path.basename(entryFile, ext);
    output = path.join(dir, `${base}.bundle${ext}`);
  }

  const s = p.spinner();
  s.start('Bundling files...');

  try {
    bundleFiles(inputs, output, workspaceRoot, extraArgs);
    s.stop(t('bundleSuccess', locale, output));
  } catch (err: any) {
    s.stop('Failed');
    throw err;
  }
}
