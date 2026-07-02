import * as fs from 'fs';
import * as path from 'path';
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

export function bundleFiles(inputs: string[], outputPath: string, workspaceRoot?: string): void {
  const resolvedOutputPath = path.resolve(outputPath);

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
