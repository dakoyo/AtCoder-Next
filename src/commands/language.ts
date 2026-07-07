import * as p from '@clack/prompts';
import pc from 'picocolors';
import { findWorkspaceRoot } from '../workspace/finder';
import { loadConfig, saveConfig } from '../config';
import { getLanguage, t } from '../utils/i18n';
import { LANGUAGE_PRESETS, addLanguage } from '../workspace/initializer';
import { AtcError } from '../utils/errors';

export async function handleLang(langName: string | undefined) {
  const workspaceRoot = findWorkspaceRoot();
  const lang = getLanguage(workspaceRoot);

  let cleanLang = langName;
  if (!cleanLang) {
    const choice = await p.select({
      message: t('langSelectMessage', lang),
      options: [
        { value: 'en', label: 'English' },
        { value: 'ja', label: '日本語' }
      ]
    });

    if (p.isCancel(choice)) {
      p.cancel(t('langCancelled', lang));
      process.exit(0);
    }
    cleanLang = choice as string;
  }

  cleanLang = cleanLang.trim().toLowerCase();

  if (cleanLang !== 'en' && cleanLang !== 'ja') {
    p.log.error(pc.red(t('langInvalid', lang)));
    process.exit(1);
  }

  const config = loadConfig(workspaceRoot);
  config.lang = cleanLang as 'en' | 'ja';
  saveConfig(workspaceRoot, config);

  p.log.success(t('langSuccess', cleanLang as 'en' | 'ja', cleanLang));
}

export async function handleAddLang(langName: string | undefined) {
  const root = findWorkspaceRoot();
  const lang = getLanguage(root);
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
}

export async function handleDefaultLang(langName: string | undefined) {
  const root = findWorkspaceRoot();
  const lang = getLanguage(root);
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
}
