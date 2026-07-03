import { gccDefinition } from './definitions/gcc';
import { clangDefinition } from './definitions/clang';
import { pythonDefinition } from './definitions/python';
import { pypyDefinition } from './definitions/pypy';
import { nodeDefinition } from './definitions/node';
import { rustDefinition } from './definitions/rust';
import { ToolchainDefinition } from './types';

export * from './types';
export * from './resolver';
export * from './detector';
export * from './os/detect-os';
export * from './os/detect-package-manager';

export const toolchainDefinitions: Record<string, ToolchainDefinition> = {
  gcc: gccDefinition,
  clang: clangDefinition,
  python: pythonDefinition,
  pypy: pypyDefinition,
  node: nodeDefinition,
  rust: rustDefinition,
};

export function getToolchainForLanguage(langId: string): ToolchainDefinition | undefined {
  if (langId === 'cpp' || langId === 'c') {
    return gccDefinition; // default to gcc for c/cpp
  }
  if (langId === 'python') {
    return pythonDefinition;
  }
  if (langId === 'rust') {
    return rustDefinition;
  }
  if (langId === 'typescript' || langId === 'javascript') {
    return nodeDefinition;
  }
  return undefined;
}
