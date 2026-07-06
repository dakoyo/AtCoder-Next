import { describe, it, expect } from 'vitest';
import { compareVersions } from './cli-handlers';
import { resolveInstallPlan } from './resolver';
import { ToolchainDefinition } from './types';

describe('compareVersions', () => {
  it('should return match when major versions are equal', () => {
    expect(compareVersions('12.2.0', '12.2.0')).toBe('match');
    expect(compareVersions('12.3.0', '12.2.0')).toBe('match');
  });

  it('should return warning when major differs but minor is equal', () => {
    expect(compareVersions('11.2.0', '12.2.0')).toBe('warning');
  });

  it('should return mismatch when both major and minor differ', () => {
    expect(compareVersions('11.1.0', '12.2.0')).toBe('mismatch');
  });
});

describe('resolveInstallPlan', () => {
  it('should resolve version manager plan if defined', async () => {
    const mockDef: ToolchainDefinition = {
      id: 'test-tool',
      displayName: 'Test Tool',
      detect: { command: 'test-tool --version', versionRegex: /(\d+\.\d+\.\d+)/ },
      versionManager: {
        id: 'test-vm',
        detectCommand: 'test-vm --version',
        selfInstallSteps: [{ command: 'install-vm' }],
        buildInstallSteps: (v) => [{ command: `test-vm install ${v}` }],
      },
      installMethods: {
        macos: [
          {
            packageManager: 'brew',
            versionSpecificity: 'exact',
            buildInstallSteps: (v) => [{ command: `brew install test-tool@${v}` }],
            buildUninstallSteps: (v) => [{ command: `brew uninstall test-tool@${v}` }],
            requiresElevatedPrivileges: false,
          }
        ]
      }
    };

    const plans = await resolveInstallPlan(mockDef, '1.2.3', 'macos');
    expect(plans).toHaveLength(2);
    expect(plans[0].strategy).toBe('version-manager');
    expect(plans[0].steps).toContainEqual({ command: 'test-vm install 1.2.3' });
    expect(plans[1].strategy).toBe('package-manager');
    expect(plans[1].steps).toContainEqual({ command: 'brew install test-tool@1.2.3' });
  });
});

import { toolchainDefinitions } from './index';

describe('resolveInstallPlan for GCC on Windows', () => {
  it('should resolve the correct steps for GCC on Windows including registry path update', async () => {
    const gccDef = toolchainDefinitions.gcc;
    const plans = await resolveInstallPlan(gccDef, '15.2.0', 'windows');
    expect(plans).toHaveLength(1);
    expect(plans[0].strategy).toBe('package-manager');
    expect(plans[0].steps).toHaveLength(3);
    expect(plans[0].steps[0].command).toBe('winget install MSYS2.MSYS2');
    expect(plans[0].steps[1].command).toContain('pacman -S --noconfirm');
    expect(plans[0].steps[2].command).toContain('SetEnvironmentVariable');
  });
});

describe('resolveInstallPlan for PyPy on Windows and macOS', () => {
  it('should resolve package-manager strategy for PyPy on Windows', async () => {
    const pypyDef = toolchainDefinitions.pypy;
    const plans = await resolveInstallPlan(pypyDef, '7.3.12', 'windows');
    expect(plans).toHaveLength(2);
    expect(plans[1].strategy).toBe('package-manager');
    expect(plans[1].steps[0].command).toBe('winget install PyPy.PyPy3');
  });

  it('should resolve both pyenv and brew strategy for PyPy on macOS', async () => {
    const pypyDef = toolchainDefinitions.pypy;
    const plans = await resolveInstallPlan(pypyDef, '7.3.12', 'macos');
    expect(plans).toHaveLength(2);
    expect(plans[0].strategy).toBe('version-manager');
    expect(plans[1].strategy).toBe('package-manager');
    expect(plans[1].steps[0].command).toBe('brew install pypy3');
  });
});

import { findAtCoderTarget } from './atcoder-compilers';

describe('findAtCoderTarget', () => {
  it('should find Rust version with rustc in name', () => {
    const compilers = [
      { id: '5001', name: 'Rust (rustc 1.70.0)' },
      { id: '5002', name: 'Python (3.11.4)' }
    ];
    const match = findAtCoderTarget('rust', 'rust', compilers);
    expect(match).toBeDefined();
    expect(match?.version).toBe('1.70.0');
  });

  it('should find Python version', () => {
    const compilers = [
      { id: '5001', name: 'Rust (rustc 1.70.0)' },
      { id: '5002', name: 'Python (3.11.4)' }
    ];
    const match = findAtCoderTarget('python', 'python', compilers);
    expect(match).toBeDefined();
    expect(match?.version).toBe('3.11.4');
  });

  it('should find PyPy version with -v release format', () => {
    const compilers = [
      { id: '5003', name: 'Python (PyPy 3.11-v7.3.20)' }
    ];
    const match = findAtCoderTarget('pypy', 'python', compilers);
    expect(match).toBeDefined();
    expect(match?.version).toBe('7.3.20');
  });

  it('should find PyPy version with legacy format', () => {
    const compilers = [
      { id: '5003', name: 'PyPy3 (7.3.0)' }
    ];
    const match = findAtCoderTarget('pypy', 'python', compilers);
    expect(match).toBeDefined();
    expect(match?.version).toBe('7.3.0');
  });

  it('should find C clang version (e.g. C11, C23) without space constraints', () => {
    const compilers = [
      { id: '5004', name: 'C11 (Clang 16.0.6)' },
      { id: '5005', name: 'C++23 (Clang 16.0.6)' }
    ];
    const match = findAtCoderTarget('clang', 'c', compilers);
    expect(match).toBeDefined();
    expect(match?.id).toBe('5004');
    expect(match?.version).toBe('16.0.6');
  });

  it('should find C gcc version (e.g. C11, C23) without space constraints', () => {
    const compilers = [
      { id: '5006', name: 'C11 (GCC 13.2.0)' },
      { id: '5007', name: 'C++23 (GCC 13.2.0)' }
    ];
    const match = findAtCoderTarget('gcc', 'c', compilers);
    expect(match).toBeDefined();
    expect(match?.id).toBe('5006');
    expect(match?.version).toBe('13.2.0');
  });

  it('should find TypeScript version using dedicated typescript toolchain', () => {
    const compilers = [
      { id: '5008', name: 'TypeScript 5.0.7 (Node.js 20.5.1)' }
    ];
    const match = findAtCoderTarget('typescript', 'typescript', compilers);
    expect(match).toBeDefined();
    expect(match?.version).toBe('5.0.7');
  });
});

