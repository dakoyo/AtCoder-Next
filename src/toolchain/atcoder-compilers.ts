import * as fs from 'fs';
import * as path from 'path';
import { getGlobalConfigDir } from '../config';
import { createAtCoderClient } from '../atcoder/client';
import * as cheerio from 'cheerio';

export interface AtCoderCompiler {
  id: string;
  name: string;
}

export interface CompilerCache {
  timestamp: number;
  compilers: AtCoderCompiler[];
}

export function getCachePath(): string {
  return path.join(getGlobalConfigDir(), 'cache', 'compilers.json');
}

export function loadCachedCompilers(): AtCoderCompiler[] | undefined {
  const cachePath = getCachePath();
  if (!fs.existsSync(cachePath)) return undefined;
  try {
    const raw = fs.readFileSync(cachePath, 'utf8');
    const data: CompilerCache = JSON.parse(raw);
    // Check if valid for 7 days
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    if (Date.now() - data.timestamp < sevenDays) {
      return data.compilers;
    }
  } catch {
    // ignore
  }
  return undefined;
}

export function saveCachedCompilers(compilers: AtCoderCompiler[]): void {
  const cachePath = getCachePath();
  const dir = path.dirname(cachePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const cacheData: CompilerCache = {
    timestamp: Date.now(),
    compilers
  };
  fs.writeFileSync(cachePath, JSON.stringify(cacheData, null, 2), 'utf8');
}

export async function fetchAtCoderCompilers(workspaceRoot: string): Promise<AtCoderCompiler[]> {
  const client = createAtCoderClient(workspaceRoot);
  const response = await client.get('/contests/practice2/submit');
  const html = response.data;
  
  const $ = cheerio.load(html);

  // If the page has login form inputs, user is not logged in.
  if ($('input[name="username"]').length > 0 || $('input[name="password"]').length > 0) {
    throw new Error('Not logged in to AtCoder. Please run "atc login" first.');
  }

  let selectElement = $('div#select-lang select');
  if (selectElement.length === 0) {
    selectElement = $('select[name="data.LanguageId"]');
  }
  if (selectElement.length === 0) {
    selectElement = $('select').first();
  }
  
  const compilers: AtCoderCompiler[] = [];
  selectElement.find('option').each((_, opt) => {
    const id = $(opt).val();
    const name = $(opt).text().trim();
    if (id && name) {
      compilers.push({ id: id.toString(), name });
    }
  });

  if (compilers.length === 0) {
    throw new Error('Could not find any compiler options on the submit page. Make sure you are logged in (run "atc login").');
  }

  return compilers;
}

export async function getAtCoderCompilers(workspaceRoot: string, refresh = false): Promise<AtCoderCompiler[]> {
  if (!refresh) {
    const cached = loadCachedCompilers();
    if (cached) return cached;
  }

  try {
    const compilers = await fetchAtCoderCompilers(workspaceRoot);
    saveCachedCompilers(compilers);
    return compilers;
  } catch (err: any) {
    // fallback to cache even if expired
    const cachePath = getCachePath();
    if (fs.existsSync(cachePath)) {
      try {
        const raw = fs.readFileSync(cachePath, 'utf8');
        const data: CompilerCache = JSON.parse(raw);
        return data.compilers;
      } catch {
        // ignore
      }
    }
    throw err;
  }
}

export function findAtCoderTarget(
  toolchainId: string,
  langId: string,
  compilers: AtCoderCompiler[]
): { id: string; name: string; version: string } | undefined {
  let regex: RegExp;
  let filterFn: (name: string) => boolean;

  if (toolchainId === 'gcc') {
    regex = /gcc\s*(\d+\.\d+(?:\.\d+)?)/i;
    if (langId === 'c') {
      filterFn = (name) => name.includes('C ') && !name.includes('C++');
    } else {
      filterFn = (name) => name.includes('C++');
    }
  } else if (toolchainId === 'clang') {
    regex = /clang\s*(\d+\.\d+(?:\.\d+)?)/i;
    if (langId === 'c') {
      filterFn = (name) => name.includes('C ') && !name.includes('C++');
    } else {
      filterFn = (name) => name.includes('C++');
    }
  } else if (toolchainId === 'python') {
    regex = /Python\s*\(?(\d+\.\d+(?:\.\d+)?)/i;
    filterFn = (name) => name.includes('Python');
  } else if (toolchainId === 'pypy') {
    regex = /PyPy3?\s*\(?(\d+\.\d+(?:\.\d+)?)/i;
    filterFn = (name) => name.includes('PyPy');
  } else if (toolchainId === 'node') {
    if (langId === 'typescript') {
      regex = /TypeScript\s*\(?(\d+\.\d+(?:\.\d+)?)/i;
      filterFn = (name) => name.includes('TypeScript');
    } else {
      regex = /Node\.js\s*\(?(\d+\.\d+(?:\.\d+)?)/i;
      filterFn = (name) => name.includes('Node.js') || name.includes('JavaScript');
    }
  } else if (toolchainId === 'rust') {
    regex = /Rust\s*\(?(?:rustc\s*)?(\d+\.\d+(?:\.\d+)?)/i;
    filterFn = (name) => name.includes('Rust');
  } else {
    return undefined;
  }

  const matches = compilers
    .filter(c => filterFn(c.name))
    .map(c => {
      let matchRegex = regex;
      if (toolchainId === 'pypy') {
        matchRegex = c.name.includes('-v')
          ? /PyPy\s*\d+(?:\.\d+)?-v(\d+\.\d+(?:\.\d+)?)/i
          : /PyPy3?\s*\(?(\d+\.\d+(?:\.\d+)?)/i;
      }
      const match = c.name.match(matchRegex);
      return match ? { id: c.id, name: c.name, version: match[1] } : null;
    })
    .filter((x): x is { id: string; name: string; version: string } => x !== null);

  if (matches.length === 0) return undefined;
  
  matches.sort((a, b) => {
    const aParts = a.version.split('.').map(Number);
    const bParts = b.version.split('.').map(Number);
    for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
      const aVal = aParts[i] || 0;
      const bVal = bParts[i] || 0;
      if (aVal !== bVal) return bVal - aVal;
    }
    return 0;
  });

  return matches[0];
}

