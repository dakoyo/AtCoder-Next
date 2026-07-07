import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// ============================================================================
// Global Config Settings
// ============================================================================

export interface GlobalConfig {
  minDelay: number;
  maxDelay: number;
  decayRate: number;
  recoveryRate: number;
}

export const DEFAULT_GLOBAL_CONFIG: GlobalConfig = {
  minDelay: 200,
  maxDelay: 600,
  decayRate: 0.1,
  recoveryRate: 3.0
};

export function getGlobalConfigDir(customDir?: string): string {
  if (customDir) {
    return customDir;
  }
  return path.join(os.homedir(), '.atcoder-next');
}

export function getGlobalConfigPath(customDir?: string): string {
  return path.join(getGlobalConfigDir(customDir), 'config.json');
}

export function loadGlobalConfig(customDir?: string): GlobalConfig {
  const configPath = getGlobalConfigPath(customDir);
  if (!fs.existsSync(configPath)) {
    const dir = getGlobalConfigDir(customDir);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(configPath, JSON.stringify(DEFAULT_GLOBAL_CONFIG, null, 2), 'utf8');
    return DEFAULT_GLOBAL_CONFIG;
  }
  try {
    const raw = fs.readFileSync(configPath, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_GLOBAL_CONFIG,
      ...parsed
    };
  } catch (e) {
    return DEFAULT_GLOBAL_CONFIG;
  }
}

export function saveGlobalConfig(config: GlobalConfig, customDir?: string): void {
  const configPath = getGlobalConfigPath(customDir);
  const dir = getGlobalConfigDir(customDir);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
}

// ============================================================================
// Local / Language Config Settings
// ============================================================================

export interface LanguageConfig {
  extension: string;
  templateDir: string;
  build: string;
  run: string;
  submitFile: string;
  atcoderLanguage?: string;
  atcoderLanguageIdRegex?: string;
}

export interface Config {
  defaultLanguage: string;
  languages: Record<string, LanguageConfig>;
  testDirName: string;
  contestDir?: string;
  lang?: 'en' | 'ja';
  extractProblemStatement?: boolean;
  problemLang?: 'en' | 'ja';
}

export const DEFAULT_CONFIG: Config = {
  defaultLanguage: 'cpp',
  languages: {
    cpp: {
      extension: 'cpp',
      templateDir: 'templates/cpp',
      build: 'g++ -O2 -std=gnu++20 -o a.out {{file: main.cpp}}',
      run: './a.out',
      submitFile: '{{file: main.cpp}}',
      atcoderLanguage: '',
      atcoderLanguageIdRegex: ''
    },
    python: {
      extension: 'py',
      templateDir: 'templates/python',
      build: '',
      run: 'python3 {{file: main.py}}',
      submitFile: '{{file: main.py}}',
      atcoderLanguage: '',
      atcoderLanguageIdRegex: ''
    },
    rust: {
      extension: 'rs',
      templateDir: 'templates/rust',
      build: 'rustc -O -o a.out {{file: main.rs}}',
      run: './a.out',
      submitFile: '{{file: main.rs}}',
      atcoderLanguage: '',
      atcoderLanguageIdRegex: ''
    },
    typescript: {
      extension: 'ts',
      templateDir: 'templates/typescript',
      build: '',
      run: 'npx ts-node {{file: main.ts}}',
      submitFile: '{{file: main.ts}}',
      atcoderLanguage: '',
      atcoderLanguageIdRegex: ''
    },
    javascript: {
      extension: 'js',
      templateDir: 'templates/javascript',
      build: '',
      run: 'node {{file: main.js}}',
      submitFile: '{{file: main.js}}',
      atcoderLanguage: '',
      atcoderLanguageIdRegex: ''
    },
    c: {
      extension: 'c',
      templateDir: 'templates/c',
      build: 'gcc -O2 -std=c11 -o a.out {{file: main.c}}',
      run: './a.out',
      submitFile: '{{file: main.c}}',
      atcoderLanguage: '',
      atcoderLanguageIdRegex: ''
    }
  },
  testDirName: 'tests',
  contestDir: '',
  lang: 'en',
  extractProblemStatement: false,
  problemLang: 'ja'
};

export function getConfigPath(workspaceRoot: string): string {
  return path.join(workspaceRoot, '.atcoder-next', 'settings.json');
}

function validateConfig(parsed: any): Config {
  const config = { ...DEFAULT_CONFIG, languages: { ...DEFAULT_CONFIG.languages } };

  if (parsed && typeof parsed === 'object') {
    if (typeof parsed.defaultLanguage === 'string') {
      config.defaultLanguage = parsed.defaultLanguage;
    }
    if (parsed.languages && typeof parsed.languages === 'object') {
      config.languages = {};
      for (const [langKey, langConf] of Object.entries(parsed.languages)) {
        if (langConf && typeof langConf === 'object') {
          const conf = langConf as any;
          config.languages[langKey] = {
            extension: typeof conf.extension === 'string' ? conf.extension : langKey,
            templateDir: typeof conf.templateDir === 'string' ? conf.templateDir : `templates/${langKey}`,
            build: typeof conf.build === 'string' ? conf.build : '',
            run: typeof conf.run === 'string' ? conf.run : '',
            submitFile: typeof conf.submitFile === 'string' ? conf.submitFile : '',
            atcoderLanguage: typeof conf.atcoderLanguage === 'string' ? conf.atcoderLanguage : '',
            atcoderLanguageIdRegex: typeof conf.atcoderLanguageIdRegex === 'string' ? conf.atcoderLanguageIdRegex : ''
          };
        }
      }
    }
    if (typeof parsed.testDirName === 'string') {
      config.testDirName = parsed.testDirName;
    }
    if (typeof parsed.contestDir === 'string') {
      config.contestDir = parsed.contestDir;
    }
    if (parsed.lang === 'en' || parsed.lang === 'ja') {
      config.lang = parsed.lang;
    }
    if (typeof parsed.extractProblemStatement === 'boolean') {
      config.extractProblemStatement = parsed.extractProblemStatement;
    }
    if (parsed.problemLang === 'en' || parsed.problemLang === 'ja') {
      config.problemLang = parsed.problemLang;
    }
  }

  return config;
}

export function loadConfig(workspaceRoot: string): Config {
  const configPath = getConfigPath(workspaceRoot);
  const oldConfigPath = path.join(workspaceRoot, '.atcoder-next', 'config.json');

  if (!fs.existsSync(configPath) && fs.existsSync(oldConfigPath)) {
    try {
      fs.renameSync(oldConfigPath, configPath);
    } catch (e) {
      // Ignore renaming error
    }
  }

  if (!fs.existsSync(configPath) && fs.existsSync(oldConfigPath)) {
    try {
      const raw = fs.readFileSync(oldConfigPath, 'utf8');
      const parsed = JSON.parse(raw);
      return validateConfig(parsed);
    } catch (e) {
      return DEFAULT_CONFIG;
    }
  }

  if (!fs.existsSync(configPath)) {
    return DEFAULT_CONFIG;
  }
  try {
    const raw = fs.readFileSync(configPath, 'utf8');
    const parsed = JSON.parse(raw);
    return validateConfig(parsed);
  } catch (e) {
    return DEFAULT_CONFIG;
  }
}

export function saveConfig(workspaceRoot: string, config: Config): void {
  const configPath = getConfigPath(workspaceRoot);
  const dir = path.dirname(configPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
}
