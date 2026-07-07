import { describe, it, expect, vi } from 'vitest';
import * as path from 'path';
import * as fs from 'fs';
import { resolveCommands, resolveTaskDirectory } from './runner';
import * as configStore from '../config';

vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  return {
    ...actual,
    existsSync: vi.fn((p: any) => {
      const normalized = p.toString().replace(/\\/g, '/');
      if (normalized.endsWith('my-contests/abc300/a')) {
        return true;
      }
      return actual.existsSync(p);
    }),
    statSync: vi.fn((p: any) => {
      const normalized = p.toString().replace(/\\/g, '/');
      if (normalized.endsWith('my-contests/abc300/a')) {
        return { isDirectory: () => true } as any;
      }
      return actual.statSync(p);
    }),
  };
});

describe('runner utils', () => {
  describe('resolveCommands', () => {
    it('should resolve placeholders with the specified file', () => {
      const langConfig = {
        extension: 'cpp',
        templateDir: 'templates/cpp',
        build: 'g++ -O2 -std=gnu++20 -o a.out {{file: main.cpp}}',
        run: './a.out',
        submitFile: '{{file: main.cpp}}'
      };

      const resolved = resolveCommands('/workspace', langConfig, 'sol.cpp', 'cpp');
      expect(resolved.build).toBe('g++ -O2 -std=gnu++20 -o a.out sol.cpp');
      expect(resolved.run).toBe('./a.out');
    });

    it('should return commands exactly as configured if no placeholder is present', () => {
      const langConfig = {
        extension: 'cpp',
        templateDir: 'templates/cpp',
        build: 'g++ -O2 -std=gnu++20 -o a.out main.cpp',
        run: './a.out',
        submitFile: 'main.cpp'
      };

      const resolved = resolveCommands('/workspace', langConfig, 'sol.cpp', 'cpp');
      expect(resolved.build).toBe('g++ -O2 -std=gnu++20 -o a.out main.cpp');
      expect(resolved.run).toBe('./a.out');
    });

    it('should handle languages without build commands and with run placeholders', () => {
      const langConfig = {
        extension: 'py',
        templateDir: 'templates/python',
        build: '',
        run: 'python3 {{file: main.py}}',
        submitFile: '{{file: main.py}}'
      };

      const resolved = resolveCommands('/workspace', langConfig, 'sol.py', 'py');
      expect(resolved.build).toBe('');
      expect(resolved.run).toBe('python3 sol.py');
    });
  });

  describe('resolveTaskDirectory', () => {
    it('should resolve task directory under configured contestDir', () => {
      const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue('/workspace');
      const loadConfigSpy = vi.spyOn(configStore, 'loadConfig').mockReturnValue({
        defaultLanguage: 'cpp',
        languages: {},
        testDirName: 'tests',
        contestDir: 'my-contests'
      });

      const resolved = resolveTaskDirectory('/workspace', 'abc300/a');
      const normalizedResolved = resolved.replace(/\\/g, '/');
      expect(normalizedResolved).toContain('my-contests/abc300/a');

      cwdSpy.mockRestore();
      loadConfigSpy.mockRestore();
    });
  });
});
