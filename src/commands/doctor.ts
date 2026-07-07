import { runDoctor, runSetup } from '../toolchain/cli-handlers';

export async function handleDoctor(languages: string[], options: { refresh?: boolean; yes?: boolean }) {
  await runDoctor({
    languages: languages.length > 0 ? languages : undefined,
    refresh: options.refresh,
    yes: options.yes
  });
}

export async function handleSetup(languages: string[], options: { refresh?: boolean; dryRun?: boolean; yes?: boolean }) {
  await runSetup({
    languages: languages.length > 0 ? languages : undefined,
    refresh: options.refresh,
    dryRun: options.dryRun,
    yes: options.yes
  });
}
