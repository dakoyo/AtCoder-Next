import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { LanguageConfig } from '../config';

export interface LanguagePreset {
  config: LanguageConfig;
  template: string;
  filename: string;
}

export type PresetMap = Record<string, LanguagePreset>;

const DEFAULT_CPP_TEMPLATE = `#include <iostream>
using namespace std;

int main() {
    // Solve the problem here
    return 0;
}
`;

const DEFAULT_PYTHON_TEMPLATE = `# Solve the problem here
`;

const DEFAULT_RUST_TEMPLATE = `fn main() {
    // Solve the problem here
}
`;

const DEFAULT_TYPESCRIPT_TEMPLATE = `// Solve the problem here
`;

const DEFAULT_JAVASCRIPT_TEMPLATE = `// Solve the problem here
`;

const DEFAULT_C_TEMPLATE = `#include <stdio.h>

int main() {
    // Solve the problem here
    return 0;
}
`;

const DEFAULT_PRESETS: PresetMap = {
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

function getGlobalSettingsDir(): string {
  return path.join(os.homedir(), '.atcoder-next');
}

export function getLanguagePresets(): PresetMap {
  const dir = getGlobalSettingsDir();
  const filePath = path.join(dir, 'languages.json');

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (fs.existsSync(filePath)) {
    try {
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data) as PresetMap;
    } catch {
      // Ignore parse errors and return defaults
    }
  }

  // Seed default presets if file does not exist or fails to parse
  try {
    fs.writeFileSync(filePath, JSON.stringify(DEFAULT_PRESETS, null, 2), { mode: 0o600 });
  } catch {
    // Ignore write errors
  }

  return DEFAULT_PRESETS;
}

export function saveLanguagePreset(langName: string, preset: LanguagePreset) {
  const dir = getGlobalSettingsDir();
  const filePath = path.join(dir, 'languages.json');

  const presets = getLanguagePresets();
  presets[langName] = preset;

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(filePath, JSON.stringify(presets, null, 2), { mode: 0o600 });
}
