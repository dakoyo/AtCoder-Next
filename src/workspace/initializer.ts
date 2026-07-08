import * as fs from 'fs';
import * as path from 'path';
import { saveConfig, Config, LanguageConfig, loadConfig, getConfigPath } from '../config';
import { AtcError } from '../utils/errors';

import { getLocale, t } from '../utils/i18n';

import { getLanguagePresets, saveLanguagePreset } from './presets';

export interface InitOptions {
  defaultLanguage: string;
  lang: 'en' | 'ja';
  extractProblemStatement: boolean;
  problemLang: 'en' | 'ja';
}

export function initWorkspace(
  targetDir: string = process.cwd(),
  optionsOrLang: string | InitOptions = 'cpp'
): { alreadyInitialized: boolean; gitignoreUpdated: boolean } {
  let options: InitOptions;
  let shouldUpdateDefaultLanguage = false;
  if (typeof optionsOrLang === 'string') {
    options = {
      defaultLanguage: optionsOrLang,
      lang: 'en',
      extractProblemStatement: false,
      problemLang: 'ja'
    };
    shouldUpdateDefaultLanguage = false;
  } else {
    options = optionsOrLang;
    shouldUpdateDefaultLanguage = true;
  }

  const defaultLanguage = options.defaultLanguage;
  const atCoderCliDir = path.join(targetDir, '.atcoder-next');
  let alreadyInitialized = false;

  if (fs.existsSync(atCoderCliDir)) {
    alreadyInitialized = true;
  } else {
    fs.mkdirSync(atCoderCliDir, { recursive: true });
  }

  const presets = getLanguagePresets();

  // Create default config if it doesn't exist
  const configPath = getConfigPath(targetDir);
  if (!fs.existsSync(configPath)) {
    const preset = presets[defaultLanguage] || {
      config: {
        extension: defaultLanguage,
        templateDir: `templates/${defaultLanguage}`,
        build: '',
        run: '',
        submitFile: `{{file: main.${defaultLanguage}}}`
      },
      template: '',
      filename: `main.${defaultLanguage}`
    };

    const initialConfig: Config = {
      defaultLanguage,
      languages: {
        [defaultLanguage]: preset.config
      },
      testDirName: 'tests',
      contestDir: '',
      lang: options.lang,
      extractProblemStatement: options.extractProblemStatement,
      problemLang: options.problemLang
    };
    saveConfig(targetDir, initialConfig);
  } else {
    const config = loadConfig(targetDir);
    config.lang = options.lang;
    config.extractProblemStatement = options.extractProblemStatement;
    config.problemLang = options.problemLang;

    const cleanLang = defaultLanguage.trim().toLowerCase();
    if (shouldUpdateDefaultLanguage) {
      config.defaultLanguage = cleanLang;
    }
    if (!config.languages[cleanLang]) {
      const preset = presets[cleanLang] || {
        config: {
          extension: cleanLang,
          templateDir: `templates/${cleanLang}`,
          build: '',
          run: '',
          submitFile: `{{file: main.${cleanLang}}}`
        },
        template: '',
        filename: `main.${cleanLang}`
      };
      config.languages[cleanLang] = preset.config;
    }
    saveConfig(targetDir, config);
  }

  // Create default templates
  const templatesDir = path.join(atCoderCliDir, 'templates');
  const preset = presets[defaultLanguage] || {
    config: {
      extension: defaultLanguage,
      templateDir: `templates/${defaultLanguage}`,
      build: '',
      run: ''
    },
    template: '',
    filename: `main.${defaultLanguage}`
  };

  const langTemplateDir = path.join(templatesDir, defaultLanguage);
  if (!fs.existsSync(langTemplateDir)) {
    fs.mkdirSync(langTemplateDir, { recursive: true });
  }
  const templateFile = path.join(langTemplateDir, preset.filename);
  if (!fs.existsSync(templateFile)) {
    fs.writeFileSync(templateFile, preset.template, 'utf8');
  }

  // Update or create .gitignore
  const gitignorePath = path.join(targetDir, '.gitignore');
  const ignoreProblem = 'problem.md';
  let gitignoreUpdated = false;

  if (fs.existsSync(gitignorePath)) {
    let content = fs.readFileSync(gitignorePath, 'utf8');
    let updated = false;
    if (!content.includes(ignoreProblem)) {
      content += (content.endsWith('\n') ? '' : '\n') + '\n# AtCoder problem statements\n' + ignoreProblem + '\n';
      updated = true;
    }
    if (updated) {
      fs.writeFileSync(gitignorePath, content, 'utf8');
      gitignoreUpdated = true;
    }
  } else {
    const defaultIgnore = `# AtCoder problem statements\n${ignoreProblem}\n`;
    fs.writeFileSync(gitignorePath, defaultIgnore, 'utf8');
    gitignoreUpdated = true;
  }

  return { alreadyInitialized, gitignoreUpdated };
}

export function addLanguage(
  workspaceRoot: string,
  langName: string,
  options: {
    extension: string;
    build: string;
    run: string;
    template?: string;
    submitFile?: string;
  }
): void {
  const config = loadConfig(workspaceRoot);
  const cleanLang = langName.trim().toLowerCase();

  if (config.languages[cleanLang]) {
    const locale = getLocale(workspaceRoot);
    throw new AtcError(t('addLangAlreadyExists', locale, cleanLang));
  }

  const presets = getLanguagePresets();
  const preset = presets[cleanLang];
  const extension = options.extension || (preset ? preset.config.extension : cleanLang);
  const build = options.build !== undefined ? options.build : (preset ? preset.config.build : '');
  const run = options.run || (preset ? preset.config.run : '');
  const template = options.template !== undefined ? options.template : (preset ? preset.template : '// Solve the problem here\n');

  const templatesDir = path.join(workspaceRoot, '.atcoder-next', 'templates');
  const langTemplateDir = path.join(templatesDir, cleanLang);
  if (!fs.existsSync(langTemplateDir)) {
    fs.mkdirSync(langTemplateDir, { recursive: true });
  }

  const filename = preset ? preset.filename : `main.${extension}`;
  const templateFile = path.join(langTemplateDir, filename);
  if (!fs.existsSync(templateFile)) {
    fs.writeFileSync(templateFile, template, 'utf8');
  }

  let presetSubmitFile = '';
  if (preset) {
    presetSubmitFile = preset.config.submitFile || `{{file: ${preset.filename}}}`;
  } else {
    presetSubmitFile = `{{file: main.${extension}}}`;
  }
  const submitFile = options.submitFile || (presetSubmitFile.includes('{{file:') ? presetSubmitFile : `{{file: ${presetSubmitFile}}}`);

  config.languages[cleanLang] = {
    extension,
    templateDir: `templates/${cleanLang}`,
    build,
    run,
    submitFile,
    atcoderLanguage: '',
    atcoderLanguageIdRegex: ''
  };

  if (!preset) {
    saveLanguagePreset(cleanLang, {
      config: config.languages[cleanLang],
      template,
      filename
    });
  }

  saveConfig(workspaceRoot, config);
}

