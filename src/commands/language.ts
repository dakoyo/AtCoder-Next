import * as p from '@clack/prompts';
import pc from 'picocolors';
import { findWorkspaceRoot } from '../workspace/finder';
import { loadConfig, saveConfig } from '../config';
import { getLocale, t } from '../utils/i18n';
import { addLanguage } from '../workspace/initializer';
import { getLanguagePresets } from '../workspace/presets';
import { AtcError } from '../utils/errors';

export async function handleLang(langName: string | undefined) {
  const workspaceRoot = findWorkspaceRoot();
  const locale = getLocale(workspaceRoot);

  let cleanLang = langName;
  if (!cleanLang) {
    if (!process.stdout.isTTY) {
      throw new AtcError(t('langNonInteractive', locale));
    }
    const choice = await p.select({
      message: t('langSelectMessage', locale),
      options: [
        { value: 'en', label: 'English' },
        { value: 'ja', label: '日本語' }
      ]
    });

    if (p.isCancel(choice)) {
      p.cancel(t('langCancelled', locale));
      process.exit(0);
    }
    cleanLang = choice as string;
  }

  cleanLang = cleanLang.trim().toLowerCase();

  if (cleanLang !== 'en' && cleanLang !== 'ja') {
    p.log.error(pc.red(t('langInvalid', locale)));
    process.exit(1);
  }

  const config = loadConfig(workspaceRoot);
  config.lang = cleanLang as 'en' | 'ja';
  saveConfig(workspaceRoot, config);

  p.log.success(t('langSuccess', cleanLang as 'en' | 'ja', cleanLang));
}

export async function handleAddLang(langName: string | undefined) {
  const root = findWorkspaceRoot();
  const locale = getLocale(root);
  const config = loadConfig(root);

  let targetLang = langName;
  const presets = getLanguagePresets();

  if (!targetLang) {
    if (!process.stdout.isTTY) {
      throw new AtcError(t('addLangNonInteractive', locale));
    }
    const availablePresets = Object.keys(presets).filter(
      (key) => !config.languages[key]
    );

    const options = [
      ...availablePresets.map((key) => ({ value: key, label: key })),
      { value: 'other', label: t('addLangSelectOther', locale) }
    ];

    const selected = await p.select({
      message: t('addLangSelectName', locale),
      options
    }) as string;

    if (p.isCancel(selected)) {
      p.cancel(t('addLangCancelled', locale));
      process.exit(0);
    }

    if (selected === 'other') {
      targetLang = await p.text({
        message: t('addLangEnterName', locale),
        validate: (val) => (!val.trim() ? t('addLangNameNotEmpty', locale) : undefined)
      }) as string;

      if (p.isCancel(targetLang)) {
        p.cancel(t('addLangCancelled', locale));
        process.exit(0);
      }
    } else {
      targetLang = selected;
    }
  }

  targetLang = targetLang.trim().toLowerCase();

  if (config.languages[targetLang]) {
    throw new AtcError(t('addLangAlreadyExists', locale, targetLang));
  }

  const preset = presets[targetLang];
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
    if (!process.stdout.isTTY) {
      throw new AtcError(t('addLangPromptNonInteractive', locale));
    }
    const extInput = await p.text({
      message: t('addLangEnterExtension', locale, targetLang),
      placeholder: targetLang,
      validate: (val) => (!val.trim() ? t('addLangExtNotEmpty', locale) : undefined)
    }) as string;

    if (p.isCancel(extInput)) {
      p.cancel(t('addLangCancelled', locale));
      process.exit(0);
    }

    const buildInput = await p.text({
      message: t('addLangEnterBuildCmd', locale),
      placeholder: locale === 'ja' ? '例: g++ -O2 main.cpp (不要な場合は空欄のまま)' : 'e.g. g++ -O2 main.cpp (leave empty if not needed)'
    }) as string;

    if (p.isCancel(buildInput)) {
      p.cancel(t('addLangCancelled', locale));
      process.exit(0);
    }

    const runInput = await p.text({
      message: t('addLangEnterRunCmd', locale),
      placeholder: locale === 'ja' ? '例: python3 main.py や ./a.out' : 'e.g. python3 main.py or ./a.out',
      validate: (val) => (!val.trim() ? t('addLangRunCmdNotEmpty', locale) : undefined)
    }) as string;

    if (p.isCancel(runInput)) {
      p.cancel(t('addLangCancelled', locale));
      process.exit(0);
    }

    extension = extInput.trim();
    build = buildInput.trim();
    run = runInput.trim();
    template = `// Solve the problem here\n`;
  }

  const s = p.spinner();
  s.start(t('addLangSpinner', locale));

  try {
    addLanguage(root, targetLang, {
      extension,
      build,
      run,
      template
    });
  } catch (e: any) {
    s.stop(t('loginVerifyFailed', locale));
    throw e;
  }

  s.stop(t('addLangSuccess', locale, targetLang));
}

export async function handleDefaultLang(langName: string | undefined) {
  const root = findWorkspaceRoot();
  const locale = getLocale(root);
  const config = loadConfig(root);

  let targetLang = langName;
  if (!targetLang) {
    if (!process.stdout.isTTY) {
      throw new AtcError(t('defaultLangNonInteractive', locale));
    }
    const configuredLangs = Object.keys(config.languages);
    if (configuredLangs.length === 0) {
      p.log.error(pc.red(t('defaultLangNoLanguages', locale)));
      process.exit(1);
    }

    const choice = await p.select({
      message: t('defaultLangSelectMessage', locale),
      options: configuredLangs.map((l) => ({ value: l, label: l }))
    });

    if (p.isCancel(choice)) {
      p.cancel(t('defaultLangCancelled', locale));
      process.exit(0);
    }

    targetLang = choice as string;
  }

  targetLang = targetLang.trim().toLowerCase();

  if (!config.languages[targetLang]) {
    p.log.error(pc.red(t('defaultLangNotConfigured', locale, targetLang)));
    process.exit(1);
  }

  config.defaultLanguage = targetLang;
  saveConfig(root, config);

  p.log.success(t('defaultLangSuccess', locale, targetLang));
}
