import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { gccDefinition } from './definitions/gcc';
import { clangDefinition } from './definitions/clang';
import { pythonDefinition } from './definitions/python';
import { pypyDefinition } from './definitions/pypy';
import { nodeDefinition } from './definitions/node';
import { typescriptDefinition } from './definitions/typescript';
import { rustDefinition } from './definitions/rust';
import { ToolchainDefinition, InstallMethod, InstallStep, OS, PackageManager, VersionSpecificity } from './types';

export * from './types';
export * from './resolver';
export * from './detector';
export * from './os/detect-os';
export * from './os/detect-package-manager';

const staticToolchainDefinitions: Record<string, ToolchainDefinition> = {
  gcc: gccDefinition,
  clang: clangDefinition,
  python: pythonDefinition,
  pypy: pypyDefinition,
  node: nodeDefinition,
  typescript: typescriptDefinition,
  rust: rustDefinition,
};

interface ExternalInstallMethod {
  packageManager: PackageManager;
  versionSpecificity: VersionSpecificity;
  requiresElevatedPrivileges: boolean;
  prerequisites?: (InstallStep | string)[];
  installSteps: (InstallStep | string)[];
  uninstallSteps?: (InstallStep | string)[];
}

interface ExternalToolchain {
  id: string;
  displayName: string;
  detect: {
    command: string;
    versionRegex: string;
  };
  installMethods: Partial<Record<OS, ExternalInstallMethod[]>>;
}

function parseExternalStep(step: any): InstallStep {
  if (typeof step === 'string') {
    return { command: step };
  }
  return {
    command: step.command || '',
    description: step.description
  };
}

function processTemplateCommand(cmd: string, version: string): string {
  const major = version.split('.')[0] || '';
  return cmd.replace(/\${version}/g, version).replace(/\${major}/g, major);
}

function convertExternalMethod(ext: ExternalInstallMethod): InstallMethod {
  return {
    packageManager: ext.packageManager,
    versionSpecificity: ext.versionSpecificity,
    requiresElevatedPrivileges: ext.requiresElevatedPrivileges,
    prerequisites: ext.prerequisites ? (version) => {
      const steps = ext.prerequisites || [];
      return steps.map(parseExternalStep).map(s => ({
        ...s,
        command: processTemplateCommand(s.command, version)
      }));
    } : undefined,
    buildInstallSteps: (version) => {
      const steps = ext.installSteps || [];
      return steps.map(parseExternalStep).map(s => ({
        ...s,
        command: processTemplateCommand(s.command, version)
      }));
    },
    buildUninstallSteps: (version) => {
      const steps = ext.uninstallSteps || [];
      return steps.map(parseExternalStep).map(s => ({
        ...s,
        command: processTemplateCommand(s.command, version)
      }));
    }
  };
}

export function loadExternalToolchains(): Record<string, ToolchainDefinition> {
  const dir = path.join(os.homedir(), '.atcoder-next');
  const filePath = path.join(dir, 'toolchains.json');
  
  const definitions: Record<string, ToolchainDefinition> = { ...staticToolchainDefinitions };
  
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch {}
  }

  if (!fs.existsSync(filePath)) {
    try {
      const sample = {
        nim: {
          id: "nim",
          displayName: "Nim",
          detect: {
            command: "nim --version",
            versionRegex: "Nim Compiler Version ([0-9.]+)"
          },
          installMethods: {
            macos: [
              {
                packageManager: "brew",
                versionSpecificity: "latest-only",
                requiresElevatedPrivileges: false,
                installSteps: [
                  { command: "brew install nim", description: "Nim をインストールします" }
                ],
                uninstallSteps: [
                  { command: "brew uninstall nim" }
                ]
              }
            ]
          }
        }
      };
      fs.writeFileSync(filePath, JSON.stringify(sample, null, 2), { mode: 0o600 });
    } catch {}
    return definitions;
  }

  try {
    const data = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(data) as Record<string, ExternalToolchain>;
    
    for (const [key, ext] of Object.entries(parsed)) {
      const installMethods: Partial<Record<OS, InstallMethod[]>> = {};
      for (const [osKey, methods] of Object.entries(ext.installMethods || {})) {
        if (methods) {
          installMethods[osKey as OS] = methods.map(convertExternalMethod);
        }
      }
      
      definitions[key] = {
        id: ext.id,
        displayName: ext.displayName,
        detect: {
          command: ext.detect.command,
          versionRegex: new RegExp(ext.detect.versionRegex)
        },
        installMethods
      };
    }
  } catch (e) {
    // Ignore errors
  }
  
  return definitions;
}

export const toolchainDefinitions = loadExternalToolchains();

export function getToolchainForLanguage(langId: string): ToolchainDefinition | undefined {
  const currentDefinitions = loadExternalToolchains();
  if (langId === 'cpp' || langId === 'c') {
    return currentDefinitions.gcc;
  }
  if (langId === 'python') {
    return currentDefinitions.python;
  }
  if (langId === 'rust') {
    return currentDefinitions.rust;
  }
  if (langId === 'typescript') {
    return currentDefinitions.typescript;
  }
  if (langId === 'javascript') {
    return currentDefinitions.node;
  }
  
  if (currentDefinitions[langId]) {
    return currentDefinitions[langId];
  }
  
  return undefined;
}
