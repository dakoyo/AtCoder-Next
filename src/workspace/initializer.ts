import * as fs from 'fs';
import * as path from 'path';
import { saveConfig, Config, LanguageConfig, loadConfig, getConfigPath } from '../config';
import { AtcError } from '../utils/errors';

export const DEFAULT_CPP_TEMPLATE = `#include <bits/stdc++.h>

using namespace std;

int main() {
    // Solve the problem here
    return 0;
}
`;

export const DEFAULT_PYTHON_TEMPLATE = `import sys

def main():
    # Solve the problem here
    pass

if __name__ == '__main__':
    main()
`;

export const DEFAULT_RUST_TEMPLATE = `fn main() {
    // Solve the problem here
}
`;

export const DEFAULT_TYPESCRIPT_TEMPLATE = `import * as fs from 'fs';

function main() {
    // Solve the problem here
}

main();
`;

export const DEFAULT_JAVASCRIPT_TEMPLATE = `const fs = require('fs');

function main() {
    // Solve the problem here
}

main();
`;

export const DEFAULT_C_TEMPLATE = `#include <stdio.h>

int main() {
    // Solve the problem here
    return 0;
}
`;

export const LANGUAGE_PRESETS: Record<string, { config: LanguageConfig; template: string; filename: string }> = {
  cpp: {
    config: {
      extension: 'cpp',
      templateDir: 'templates/cpp',
      build: 'g++ -O2 -std=gnu++20 -o a.out main.cpp',
      run: './a.out',
      submitFile: 'main.cpp',
      atcoderLanguage: '',
      atcoderLanguageIdRegex: ''
    },
    template: DEFAULT_CPP_TEMPLATE,
    filename: 'main.cpp'
  },
  python: {
    config: {
      extension: 'py',
      templateDir: 'templates/python',
      build: '',
      run: 'python3 main.py',
      submitFile: 'main.py',
      atcoderLanguage: '',
      atcoderLanguageIdRegex: ''
    },
    template: DEFAULT_PYTHON_TEMPLATE,
    filename: 'main.py'
  },
  rust: {
    config: {
      extension: 'rs',
      templateDir: 'templates/rust',
      build: 'rustc -O -o a.out main.rs',
      run: './a.out',
      submitFile: 'main.rs',
      atcoderLanguage: '',
      atcoderLanguageIdRegex: ''
    },
    template: DEFAULT_RUST_TEMPLATE,
    filename: 'main.rs'
  },
  typescript: {
    config: {
      extension: 'ts',
      templateDir: 'templates/typescript',
      build: '',
      run: 'npx ts-node main.ts',
      submitFile: 'main.ts',
      atcoderLanguage: '',
      atcoderLanguageIdRegex: ''
    },
    template: DEFAULT_TYPESCRIPT_TEMPLATE,
    filename: 'main.ts'
  },
  javascript: {
    config: {
      extension: 'js',
      templateDir: 'templates/javascript',
      build: '',
      run: 'node main.js',
      submitFile: 'main.js',
      atcoderLanguage: '',
      atcoderLanguageIdRegex: ''
    },
    template: DEFAULT_JAVASCRIPT_TEMPLATE,
    filename: 'main.js'
  },
  c: {
    config: {
      extension: 'c',
      templateDir: 'templates/c',
      build: 'gcc -O2 -std=c11 -o a.out main.c',
      run: './a.out',
      submitFile: 'main.c',
      atcoderLanguage: '',
      atcoderLanguageIdRegex: ''
    },
    template: DEFAULT_C_TEMPLATE,
    filename: 'main.c'
  }
};

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

  // Create default config if it doesn't exist
  const configPath = getConfigPath(targetDir);
  if (!fs.existsSync(configPath)) {
    const preset = LANGUAGE_PRESETS[defaultLanguage] || {
      config: {
        extension: defaultLanguage,
        templateDir: `templates/${defaultLanguage}`,
        build: '',
        run: ''
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
      const preset = LANGUAGE_PRESETS[cleanLang] || {
        config: {
          extension: cleanLang,
          templateDir: `templates/${cleanLang}`,
          build: '',
          run: ''
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
  const preset = LANGUAGE_PRESETS[defaultLanguage] || {
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
  }
): void {
  const config = loadConfig(workspaceRoot);
  const cleanLang = langName.trim().toLowerCase();

  if (config.languages[cleanLang]) {
    throw new AtcError(`Language "${cleanLang}" is already configured.`);
  }

  const preset = LANGUAGE_PRESETS[cleanLang];
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

  const submitFile = preset ? preset.filename : `main.${extension}`;

  config.languages[cleanLang] = {
    extension,
    templateDir: `templates/${cleanLang}`,
    build,
    run,
    submitFile,
    atcoderLanguage: '',
    atcoderLanguageIdRegex: ''
  };

  saveConfig(workspaceRoot, config);
}

