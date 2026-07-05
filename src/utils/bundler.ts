import * as fs from 'fs';
import * as path from 'path';
import * as esbuild from 'esbuild';
import { spawnSync } from 'child_process';
import { AtcError } from './errors';

export interface LanguageConfig {
  extensions: string[];
  detectImport: (line: string, inBlockComment: boolean) => string | null;
  cleanLine: (line: string) => string | null;
  inBlockCommentUpdate: (line: string, inBlockComment: boolean) => boolean;
}

const cppConfig: LanguageConfig = {
  extensions: ['.cpp', '.hpp', '.cc', '.c', '.h', '.C', '.H', '.cxx', '.hxx'],
  inBlockCommentUpdate: (line, inBlockComment) => {
    let current = inBlockComment;
    let pos = 0;
    while (pos < line.length) {
      if (!current) {
        const idx = line.indexOf('/*', pos);
        if (idx === -1) break;
        const closeIdx = line.indexOf('*/', idx + 2);
        if (closeIdx !== -1) {
          pos = closeIdx + 2;
        } else {
          current = true;
          break;
        }
      } else {
        const idx = line.indexOf('*/', pos);
        if (idx === -1) break;
        current = false;
        pos = idx + 2;
      }
    }
    return current;
  },
  detectImport: (line, inBlockComment) => {
    if (inBlockComment) return null;
    // Check if line starts with single line comment (ignoring whitespace)
    if (line.trim().startsWith('//')) return null;
    
    const includeRegex = /^\s*#\s*include\s*"([^"]+)"/;
    const match = includeRegex.exec(line);
    return match ? match[1] : null;
  },
  cleanLine: (line) => {
    // Remove "#pragma once" lines
    const pragmaOnceRegex = /^\s*#\s*pragma\s+once\b/;
    if (pragmaOnceRegex.test(line)) {
      return null;
    }
    return line;
  }
};

export const bundlerRegistry: Record<string, LanguageConfig> = {
  cpp: cppConfig
};

export function getLanguageConfig(filePath: string): LanguageConfig | undefined {
  const ext = path.extname(filePath).toLowerCase();
  for (const config of Object.values(bundlerRegistry)) {
    if (config.extensions.map(e => e.toLowerCase()).includes(ext)) {
      return config;
    }
  }
  return undefined;
}

const JS_TS_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];

function isJsTsFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return JS_TS_EXTENSIONS.includes(ext);
}

const PYTHON_EXTENSIONS = ['.py'];

function isPythonFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return PYTHON_EXTENSIONS.includes(ext);
}

function resolvePythonModule(moduleName: string, currentDir: string, workspaceRoot?: string): string | null {
  const relativePath = moduleName.replace(/\./g, '/');
  
  const searchDirs = [
    currentDir,
    ...(workspaceRoot ? [workspaceRoot] : []),
    process.cwd()
  ];

  for (const dir of searchDirs) {
    const p1 = path.resolve(dir, `${relativePath}.py`);
    if (fs.existsSync(p1) && fs.statSync(p1).isFile()) {
      return p1;
    }
    const p2 = path.resolve(dir, relativePath, '__init__.py');
    if (fs.existsSync(p2) && fs.statSync(p2).isFile()) {
      return p2;
    }
  }

  if (moduleName.includes('.')) {
    const parts = moduleName.split('.');
    for (let i = parts.length - 1; i > 0; i--) {
      const parentModuleName = parts.slice(0, i).join('.');
      const resolved = resolvePythonModule(parentModuleName, currentDir, workspaceRoot);
      if (resolved) {
        return resolved;
      }
    }
  }

  return null;
}

function getPythonModuleName(absolutePath: string, currentDir: string, workspaceRoot?: string): string {
  const searchDirs = [
    currentDir,
    ...(workspaceRoot ? [workspaceRoot] : []),
    process.cwd()
  ];

  let bestRelativePath: string | null = null;

  for (const dir of searchDirs) {
    const relative = path.relative(dir, absolutePath);
    if (!relative.startsWith('..') && !path.isAbsolute(relative)) {
      if (bestRelativePath === null || relative.length < bestRelativePath.length) {
        bestRelativePath = relative;
      }
    }
  }

  if (!bestRelativePath) {
    const base = path.basename(absolutePath, '.py');
    return base;
  }

  let modPath = bestRelativePath.replace(/\.py$/, '');
  if (modPath.endsWith('__init__')) {
    modPath = modPath.slice(0, -'__init__'.length);
  }
  modPath = modPath.replace(/[/\\]+$/, '');

  return modPath.replace(/[/\\]/g, '.');
}

interface PythonModuleInfo {
  absolutePath: string;
  moduleName: string;
  code: string;
}

function bundlePython(inputs: string[], resolvedOutputPath: string, workspaceRoot?: string): void {
  const visited = new Set<string>();
  const activeStack: string[] = [];
  const resolvedModules: PythonModuleInfo[] = [];

  const importRegex = /^\s*import\s+([a-zA-Z_][a-zA-Z0-9_]*)/;
  const fromImportRegex = /^\s*from\s+([a-zA-Z_][a-zA-Z0-9_\.]*)\s+import/;

  const entryDir = path.dirname(path.resolve(inputs[0]));

  function processPythonFile(filePath: string, isEntry: boolean = false): void {
    const absolutePath = path.resolve(filePath);

    if (activeStack.includes(absolutePath)) {
      throw new AtcError(`Circular dependency detected: ${activeStack.join(' -> ')} -> ${absolutePath}`);
    }

    if (visited.has(absolutePath)) {
      return;
    }

    if (!isEntry) {
      visited.add(absolutePath);
    }
    activeStack.push(absolutePath);

    // 親パッケージの __init__.py があれば、先に依存関係として処理する
    const parentDir = path.dirname(absolutePath);
    const parentInit = path.join(parentDir, '__init__.py');
    if (path.basename(absolutePath) !== '__init__.py' && fs.existsSync(parentInit)) {
      processPythonFile(parentInit);
    }

    const content = fs.readFileSync(absolutePath, 'utf8');
    const lines = content.split(/\r?\n/);
    const currentDir = path.dirname(absolutePath);

    const dependencies: { moduleName: string; path: string }[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('#')) continue;

      let moduleName: string | null = null;
      const importMatch = importRegex.exec(trimmed);
      if (importMatch) {
        moduleName = importMatch[1];
      } else {
        const fromImportMatch = fromImportRegex.exec(trimmed);
        if (fromImportMatch) {
          moduleName = fromImportMatch[1];
        }
      }

      if (moduleName) {
        const resolvedPath = resolvePythonModule(moduleName, currentDir, workspaceRoot);
        if (resolvedPath) {
          dependencies.push({ moduleName, path: resolvedPath });
        }
      }
    }

    for (const dep of dependencies) {
      processPythonFile(dep.path);
    }

    activeStack.pop();

    if (!isEntry) {
      const moduleName = getPythonModuleName(absolutePath, entryDir, workspaceRoot);
      resolvedModules.push({
        absolutePath,
        moduleName,
        code: content
      });
    }
  }

  let finalContent = '';
  const entryContents: string[] = [];

  for (const input of inputs) {
    let absoluteInputPath = path.resolve(input);
    if (!fs.existsSync(absoluteInputPath)) {
      let found = false;
      if (workspaceRoot) {
        const wsPath = path.resolve(workspaceRoot, input);
        if (fs.existsSync(wsPath)) {
          absoluteInputPath = wsPath;
          found = true;
        }
      }
      if (!found) {
        const cwdPath = path.resolve(process.cwd(), input);
        if (fs.existsSync(cwdPath)) {
          absoluteInputPath = cwdPath;
          found = true;
        }
      }
      if (!found) {
        throw new AtcError(`File not found: ${input}`);
      }
    }

    if (absoluteInputPath === resolvedOutputPath) {
      throw new AtcError(`Input file and output file cannot be the same: "${input}".`);
    }

    processPythonFile(absoluteInputPath, true);
    entryContents.push(fs.readFileSync(absoluteInputPath, 'utf8'));
  }

  let headerContent = '';
  if (resolvedModules.length > 0) {
    headerContent += 'import sys, base64\n';
    headerContent += 'from types import ModuleType\n\n';

    for (const mod of resolvedModules) {
      const base64Code = Buffer.from(mod.code, 'utf8').toString('base64');
      const safeVarName = mod.moduleName.replace(/[^a-zA-Z0-9_]/g, '_');
      headerContent += `# --- atc bundle: ${mod.moduleName} ---\n`;
      headerContent += `_mod_${safeVarName} = ModuleType(${JSON.stringify(mod.moduleName)})\n`;
      
      if (mod.moduleName.includes('.')) {
        const parts = mod.moduleName.split('.');
        const parentName = parts.slice(0, -1).join('.');
        const childName = parts[parts.length - 1];
        headerContent += `if ${JSON.stringify(parentName)} in sys.modules:\n`;
        headerContent += `    setattr(sys.modules[${JSON.stringify(parentName)}], ${JSON.stringify(childName)}, _mod_${safeVarName})\n`;
      }
      headerContent += `sys.modules[${JSON.stringify(mod.moduleName)}] = _mod_${safeVarName}\n`;
      headerContent += `exec(base64.b64decode(b${JSON.stringify(base64Code)}).decode("utf-8"), _mod_${safeVarName}.__dict__)\n\n`;
    }
  }

  finalContent += headerContent;
  for (let i = 0; i < entryContents.length; i++) {
    finalContent += `# --- atc bundle: entry file ${i + 1} ---\n`;
    finalContent += entryContents[i] + '\n';
  }

  const outputDir = path.dirname(resolvedOutputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(resolvedOutputPath, finalContent, 'utf8');
}

function bundleJsTs(inputs: string[], resolvedOutputPath: string, workspaceRoot?: string, extraArgs: string[] = []): void {
  let outputContent = '';

  const esbuildLibPath = require.resolve('esbuild');
  const esbuildBinPath = path.resolve(path.dirname(esbuildLibPath), '../bin/esbuild');

  for (const input of inputs) {
    let absoluteInputPath = path.resolve(input);
    if (!fs.existsSync(absoluteInputPath)) {
      let found = false;
      if (workspaceRoot) {
        const wsPath = path.resolve(workspaceRoot, input);
        if (fs.existsSync(wsPath)) {
          absoluteInputPath = wsPath;
          found = true;
        }
      }
      if (!found) {
        const cwdPath = path.resolve(process.cwd(), input);
        if (fs.existsSync(cwdPath)) {
          absoluteInputPath = cwdPath;
          found = true;
        }
      }
      if (!found) {
        throw new AtcError(`File not found: ${input}`);
      }
    }

    if (absoluteInputPath === resolvedOutputPath) {
      throw new AtcError(`Input file and output file cannot be the same: "${input}".`);
    }

    const args = [
      absoluteInputPath,
      '--bundle',
      '--platform=node',
      '--target=node20',
      '--format=cjs',
      ...extraArgs
    ];

    const result = spawnSync(esbuildBinPath, args, {
      encoding: 'utf8',
    });

    if (result.status !== 0) {
      throw new AtcError(`Failed to bundle JS/TS file "${input}": ${result.stderr || result.error}`);
    }

    outputContent += result.stdout + '\n';
  }

  // Write the bundled content to output file
  const outputDir = path.dirname(resolvedOutputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(resolvedOutputPath, outputContent, 'utf8');
}

const RUST_EXTENSIONS = ['.rs'];

function isRustFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return RUST_EXTENSIONS.includes(ext);
}

function resolveRustModule(moduleName: string, currentFilePath: string): string | null {
  const currentDir = path.dirname(currentFilePath);
  const currentFileName = path.basename(currentFilePath, '.rs');

  let baseDir: string;
  if (currentFileName === 'main' || currentFileName === 'lib' || currentFileName === 'mod') {
    baseDir = currentDir;
  } else {
    baseDir = path.join(currentDir, currentFileName);
  }

  const p1 = path.resolve(baseDir, `${moduleName}.rs`);
  if (fs.existsSync(p1) && fs.statSync(p1).isFile()) {
    return p1;
  }

  const p2 = path.resolve(baseDir, moduleName, 'mod.rs');
  if (fs.existsSync(p2) && fs.statSync(p2).isFile()) {
    return p2;
  }

  return null;
}

function bundleRust(inputs: string[], resolvedOutputPath: string, workspaceRoot?: string): void {
  const activeStack: string[] = [];

  const modRegex = /^\s*(?:pub\s+)?mod\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*;/;

  function processRustFile(filePath: string): string[] {
    const absolutePath = path.resolve(filePath);

    if (activeStack.includes(absolutePath)) {
      throw new AtcError(`Circular dependency detected: ${activeStack.join(' -> ')} -> ${absolutePath}`);
    }

    activeStack.push(absolutePath);

    if (!fs.existsSync(absolutePath)) {
      throw new AtcError(`File not found: ${filePath}`);
    }

    const content = fs.readFileSync(absolutePath, 'utf8');
    const lines = content.split(/\r?\n/);
    const result: string[] = [];

    for (const line of lines) {
      const match = modRegex.exec(line);
      if (match) {
        const moduleName = match[1];
        const resolvedPath = resolveRustModule(moduleName, absolutePath);
        if (resolvedPath) {
          result.push(`// --- atc bundle: mod ${moduleName} ---`);
          
          const matchStr = match[0];
          const replacement = matchStr.replace(/;\s*$/, ' {');
          const newLine = line.replace(matchStr, replacement);
          result.push(newLine);
          
          const modLines = processRustFile(resolvedPath);
          result.push(...modLines);
          
          result.push(`}`);
        } else {
          result.push(line);
        }
      } else {
        result.push(line);
      }
    }

    activeStack.pop();
    return result;
  }

  let finalContent = '';
  for (const input of inputs) {
    let absoluteInputPath = path.resolve(input);
    if (!fs.existsSync(absoluteInputPath)) {
      let found = false;
      if (workspaceRoot) {
        const wsPath = path.resolve(workspaceRoot, input);
        if (fs.existsSync(wsPath)) {
          absoluteInputPath = wsPath;
          found = true;
        }
      }
      if (!found) {
        const cwdPath = path.resolve(process.cwd(), input);
        if (fs.existsSync(cwdPath)) {
          absoluteInputPath = cwdPath;
          found = true;
        }
      }
      if (!found) {
        throw new AtcError(`File not found: ${input}`);
      }
    }

    if (absoluteInputPath === resolvedOutputPath) {
      throw new AtcError(`Input file and output file cannot be the same: "${input}".`);
    }

    const lines = processRustFile(absoluteInputPath);
    finalContent += lines.join('\n') + '\n';
  }

  const outputDir = path.dirname(resolvedOutputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(resolvedOutputPath, finalContent, 'utf8');
}

export function bundleFiles(inputs: string[], outputPath: string, workspaceRoot?: string, extraArgs?: string[]): void {
  const resolvedOutputPath = path.resolve(outputPath);

  if (inputs.some(isJsTsFile)) {
    bundleJsTs(inputs, resolvedOutputPath, workspaceRoot, extraArgs);
    return;
  }

  if (inputs.some(isPythonFile)) {
    bundlePython(inputs, resolvedOutputPath, workspaceRoot);
    return;
  }

  if (inputs.some(isRustFile)) {
    bundleRust(inputs, resolvedOutputPath, workspaceRoot);
    return;
  }

  for (const input of inputs) {
    let absoluteInputPath = path.resolve(input);
    if (!fs.existsSync(absoluteInputPath)) {
      let found = false;
      if (workspaceRoot) {
        const wsPath = path.resolve(workspaceRoot, input);
        if (fs.existsSync(wsPath)) {
          absoluteInputPath = wsPath;
          found = true;
        }
      }
      if (!found) {
        const cwdPath = path.resolve(process.cwd(), input);
        if (fs.existsSync(cwdPath)) {
          absoluteInputPath = cwdPath;
        }
      }
    }
    if (absoluteInputPath === resolvedOutputPath) {
      throw new AtcError(`Input file and output file cannot be the same: "${input}".`);
    }
  }

  const visited = new Set<string>();
  const activeStack: string[] = [];
  const bundledLines: string[] = [];

  function processFile(filePath: string): string[] {
    let absolutePath = path.resolve(filePath);

    // If file doesn't exist, we will try alternative search paths
    if (!fs.existsSync(absolutePath)) {
      let found = false;
      const relativePath = filePath; // If it was passed as relative
      
      // 1. Try relative to workspace root
      if (workspaceRoot) {
        const wsPath = path.resolve(workspaceRoot, relativePath);
        if (fs.existsSync(wsPath)) {
          absolutePath = wsPath;
          found = true;
        }
      }
      
      // 2. Try relative to current working directory
      if (!found) {
        const cwdPath = path.resolve(process.cwd(), relativePath);
        if (fs.existsSync(cwdPath)) {
          absolutePath = cwdPath;
          found = true;
        }
      }

      if (!found) {
        throw new AtcError(`File not found: ${filePath}`);
      }
    }

    if (activeStack.includes(absolutePath)) {
      throw new AtcError(`Circular dependency detected: ${activeStack.join(' -> ')} -> ${absolutePath}`);
    }

    if (visited.has(absolutePath)) {
      return [];
    }

    visited.add(absolutePath);
    activeStack.push(absolutePath);

    const config = getLanguageConfig(absolutePath);
    if (!config) {
      const ext = path.extname(absolutePath);
      throw new AtcError(`Unsupported file type: "${ext || path.basename(absolutePath)}".`);
    }
    const content = fs.readFileSync(absolutePath, 'utf8');
    const lines = content.split(/\r?\n/);
    
    let inBlockComment = false;
    const result: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Check for import detection
      const importPath = config.detectImport(line, inBlockComment);
      
      // Update block comment state for next line/elements
      inBlockComment = config.inBlockCommentUpdate(line, inBlockComment);

      if (importPath) {
        // Resolve relative to the current file's directory first
        const currentDir = path.dirname(absolutePath);
        let resolvedImportPath = path.resolve(currentDir, importPath);

        if (!fs.existsSync(resolvedImportPath)) {
          let found = false;
          // Try relative to workspace root
          if (workspaceRoot) {
            const wsPath = path.resolve(workspaceRoot, importPath);
            if (fs.existsSync(wsPath)) {
              resolvedImportPath = wsPath;
              found = true;
            }
          }
          // Try relative to current working directory
          if (!found) {
            const cwdPath = path.resolve(process.cwd(), importPath);
            if (fs.existsSync(cwdPath)) {
              resolvedImportPath = cwdPath;
              found = true;
            }
          }
          if (!found) {
            throw new AtcError(`Included file "${importPath}" not found (searched relative to "${currentDir}", workspace root, and CWD).`);
          }
        }

        // Recursively process the imported file
        try {
          const importedLines = processFile(resolvedImportPath);
          result.push(...importedLines);
        } catch (err: any) {
          if (err instanceof AtcError) {
            throw err;
          }
          throw new AtcError(`Failed to bundle "${importPath}" included in "${absolutePath}": ${err.message}`);
        }
      } else {
        const cleaned = config.cleanLine(line);
        if (cleaned !== null) {
          result.push(cleaned);
        }
      }
    }

    activeStack.pop();
    return result;
  }

  for (const input of inputs) {
    const lines = processFile(input);
    bundledLines.push(...lines);
  }

  // Write the bundled content to output file
  const outputDir = path.dirname(resolvedOutputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  let outputContent = bundledLines.join('\n');
  if (bundledLines.length > 0 && !outputContent.endsWith('\n')) {
    outputContent += '\n';
  }

  fs.writeFileSync(resolvedOutputPath, outputContent, 'utf8');
}
