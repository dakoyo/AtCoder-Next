import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { initWorkspace, addLanguage } from './initializer';
import { loadConfig } from '../config';

describe('initializer', () => {
  const tempDir = path.join(__dirname, '../../test-temp-init');

  beforeEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    fs.mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should initialize workspace with cpp only if cpp is selected', () => {
    const { alreadyInitialized, gitignoreUpdated } = initWorkspace(tempDir, 'cpp');

    expect(alreadyInitialized).toBe(false);
    expect(gitignoreUpdated).toBe(true);

    const atCoderCliDir = path.join(tempDir, '.atcoder-next');
    expect(fs.existsSync(atCoderCliDir)).toBe(true);

    // Verify config.json contains only cpp
    const config = loadConfig(tempDir);
    expect(config.defaultLanguage).toBe('cpp');
    expect(config.languages).toHaveProperty('cpp');
    expect(config.languages).not.toHaveProperty('python');

    // Verify templates contains only cpp
    const templatesDir = path.join(atCoderCliDir, 'templates');
    expect(fs.existsSync(path.join(templatesDir, 'cpp'))).toBe(true);
    expect(fs.existsSync(path.join(templatesDir, 'cpp', 'main.cpp'))).toBe(true);
    expect(fs.existsSync(path.join(templatesDir, 'python'))).toBe(false);

    // Verify .gitignore contains problem.md
    const gitignorePath = path.join(tempDir, '.gitignore');
    expect(fs.existsSync(gitignorePath)).toBe(true);
    const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
    expect(gitignoreContent).toContain('problem.md');
  });

  it('should initialize workspace with python only if python is selected', () => {
    const { alreadyInitialized, gitignoreUpdated } = initWorkspace(tempDir, 'python');

    expect(alreadyInitialized).toBe(false);
    expect(gitignoreUpdated).toBe(true);

    const atCoderCliDir = path.join(tempDir, '.atcoder-next');
    expect(fs.existsSync(atCoderCliDir)).toBe(true);

    // Verify config.json contains only python
    const config = loadConfig(tempDir);
    expect(config.defaultLanguage).toBe('python');
    expect(config.languages).toHaveProperty('python');
    expect(config.languages).not.toHaveProperty('cpp');

    // Verify templates contains only python
    const templatesDir = path.join(atCoderCliDir, 'templates');
    expect(fs.existsSync(path.join(templatesDir, 'python'))).toBe(true);
    expect(fs.existsSync(path.join(templatesDir, 'python', 'main.py'))).toBe(true);
    expect(fs.existsSync(path.join(templatesDir, 'cpp'))).toBe(false);
  });

  it('should initialize workspace with rust only if rust is selected', () => {
    const { alreadyInitialized, gitignoreUpdated } = initWorkspace(tempDir, 'rust');

    expect(alreadyInitialized).toBe(false);
    expect(gitignoreUpdated).toBe(true);

    const atCoderCliDir = path.join(tempDir, '.atcoder-next');
    expect(fs.existsSync(atCoderCliDir)).toBe(true);

    const config = loadConfig(tempDir);
    expect(config.defaultLanguage).toBe('rust');
    expect(config.languages).toHaveProperty('rust');
    expect(config.languages).not.toHaveProperty('cpp');

    const templatesDir = path.join(atCoderCliDir, 'templates');
    expect(fs.existsSync(path.join(templatesDir, 'rust'))).toBe(true);
    expect(fs.existsSync(path.join(templatesDir, 'rust', 'main.rs'))).toBe(true);
    expect(fs.existsSync(path.join(templatesDir, 'cpp'))).toBe(false);
  });

  it('should initialize workspace with typescript only if typescript is selected', () => {
    const { alreadyInitialized, gitignoreUpdated } = initWorkspace(tempDir, 'typescript');

    expect(alreadyInitialized).toBe(false);
    expect(gitignoreUpdated).toBe(true);

    const atCoderCliDir = path.join(tempDir, '.atcoder-next');
    expect(fs.existsSync(atCoderCliDir)).toBe(true);

    const config = loadConfig(tempDir);
    expect(config.defaultLanguage).toBe('typescript');
    expect(config.languages).toHaveProperty('typescript');
    expect(config.languages).not.toHaveProperty('cpp');

    const templatesDir = path.join(atCoderCliDir, 'templates');
    expect(fs.existsSync(path.join(templatesDir, 'typescript'))).toBe(true);
    expect(fs.existsSync(path.join(templatesDir, 'typescript', 'main.ts'))).toBe(true);
    expect(fs.existsSync(path.join(templatesDir, 'cpp'))).toBe(false);
  });

  it('should initialize workspace with javascript only if javascript is selected', () => {
    const { alreadyInitialized, gitignoreUpdated } = initWorkspace(tempDir, 'javascript');

    expect(alreadyInitialized).toBe(false);
    expect(gitignoreUpdated).toBe(true);

    const atCoderCliDir = path.join(tempDir, '.atcoder-next');
    expect(fs.existsSync(atCoderCliDir)).toBe(true);

    const config = loadConfig(tempDir);
    expect(config.defaultLanguage).toBe('javascript');
    expect(config.languages).toHaveProperty('javascript');
    expect(config.languages).not.toHaveProperty('cpp');

    const templatesDir = path.join(atCoderCliDir, 'templates');
    expect(fs.existsSync(path.join(templatesDir, 'javascript'))).toBe(true);
    expect(fs.existsSync(path.join(templatesDir, 'javascript', 'main.js'))).toBe(true);
    expect(fs.existsSync(path.join(templatesDir, 'cpp'))).toBe(false);
  });

  it('should initialize workspace with c only if c is selected', () => {
    const { alreadyInitialized, gitignoreUpdated } = initWorkspace(tempDir, 'c');

    expect(alreadyInitialized).toBe(false);
    expect(gitignoreUpdated).toBe(true);

    const atCoderCliDir = path.join(tempDir, '.atcoder-next');
    expect(fs.existsSync(atCoderCliDir)).toBe(true);

    const config = loadConfig(tempDir);
    expect(config.defaultLanguage).toBe('c');
    expect(config.languages).toHaveProperty('c');
    expect(config.languages).not.toHaveProperty('cpp');

    const templatesDir = path.join(atCoderCliDir, 'templates');
    expect(fs.existsSync(path.join(templatesDir, 'c'))).toBe(true);
    expect(fs.existsSync(path.join(templatesDir, 'c', 'main.c'))).toBe(true);
    expect(fs.existsSync(path.join(templatesDir, 'cpp'))).toBe(false);
  });

  it('should add the language config to config.json when initWorkspace is run on already initialized workspace with a new language', () => {
    // 1. Initialize with cpp first
    initWorkspace(tempDir, 'cpp');
    let config = loadConfig(tempDir);
    expect(config.defaultLanguage).toBe('cpp');
    expect(config.languages).toHaveProperty('cpp');
    expect(config.languages).not.toHaveProperty('python');

    // 2. Initialize with python (which is not configured yet)
    const { alreadyInitialized } = initWorkspace(tempDir, 'python');
    expect(alreadyInitialized).toBe(true);

    // 3. Verify config.json has both cpp and python
    config = loadConfig(tempDir);
    // defaultLanguage should remain 'cpp' because it was already initialized, or wait, the requirement is "config.jsonは編集されず... もしadd-langしていない言語ならconfig.jsonにも追加"
    // Since it's not changed, defaultLanguage should still be 'cpp' (not modified), but languages should contain both cpp and python.
    expect(config.defaultLanguage).toBe('cpp');
    expect(config.languages).toHaveProperty('cpp');
    expect(config.languages).toHaveProperty('python');
    expect(config.languages.python.extension).toBe('py');

    // 4. Verify templates folder for python is also created
    const atCoderCliDir = path.join(tempDir, '.atcoder-next');
    const templatesDir = path.join(atCoderCliDir, 'templates');
    expect(fs.existsSync(path.join(templatesDir, 'python'))).toBe(true);
    expect(fs.existsSync(path.join(templatesDir, 'python', 'main.py'))).toBe(true);
  });

  describe('addLanguage', () => {
    it('should throw an error if the language is already configured', () => {
      initWorkspace(tempDir, 'cpp');

      expect(() => {
        addLanguage(tempDir, 'cpp', {
          extension: 'cpp',
          build: '',
          run: ''
        });
      }).toThrowError('Language "cpp" is already configured.');
    });

    it('should add a new non-preset language', () => {
      initWorkspace(tempDir, 'cpp');

      addLanguage(tempDir, 'rust', {
        extension: 'rs',
        build: 'rustc main.rs',
        run: './main',
        template: '// Rust main\n'
      });

      const config = loadConfig(tempDir);
      expect(config.languages).toHaveProperty('rust');
      expect(config.languages.rust.extension).toBe('rs');
      expect(config.languages.rust.build).toBe('rustc main.rs');
      expect(config.languages.rust.run).toBe('./main');

      const templatePath = path.join(tempDir, '.atcoder-next', 'templates', 'rust', 'main.rs');
      expect(fs.existsSync(templatePath)).toBe(true);
      expect(fs.readFileSync(templatePath, 'utf8')).toBe('// Rust main\n');
    });

    it('should add a preset language (like python) when cpp is already initialized', () => {
      initWorkspace(tempDir, 'cpp');

      addLanguage(tempDir, 'python', {
        extension: '',
        build: '',
        run: ''
      });

      const config = loadConfig(tempDir);
      expect(config.languages).toHaveProperty('python');
      expect(config.languages.python.extension).toBe('py');
      expect(config.languages.python.run).toBe('python3 main.py');

      const templatePath = path.join(tempDir, '.atcoder-next', 'templates', 'python', 'main.py');
      expect(fs.existsSync(templatePath)).toBe(true);
    });
  });
});
