import * as fs from 'fs';
import * as path from 'path';
import { spawn, exec } from 'child_process';
import { findWorkspaceRoot } from '../workspace/finder';
import { loadConfig, Config, LanguageConfig } from '../config';
import { compareOutput } from './diff';
import { AtcError } from '../utils/errors';

// Windows Win32 FFI for Memory measurements via koffi
let koffi: any = null;
let OpenProcess: any = null;
let CloseHandle: any = null;
let GetProcessMemoryInfo: any = null;
let PROCESS_MEMORY_COUNTERS: any = null;
let isKoffiLoaded = false;

if (process.platform === 'win32') {
  try {
    const pkgName = 'koffi';
    koffi = require(pkgName);
    const kernel32 = koffi.load('kernel32.dll');
    const psapi = koffi.load('psapi.dll');

    const HANDLE = koffi.pointer('HANDLE', koffi.opaque());
    const DWORD = koffi.alias('DWORD', 'uint32_t');
    const SIZE_T = koffi.alias('SIZE_T', process.arch === 'x64' ? 'uint64_t' : 'uint32_t');
    const BOOL = koffi.alias('BOOL', 'int');

    PROCESS_MEMORY_COUNTERS = koffi.struct('PROCESS_MEMORY_COUNTERS', {
      cb: DWORD,
      PageFaultCount: DWORD,
      PeakWorkingSetSize: SIZE_T,
      WorkingSetSize: SIZE_T,
      QuotaPeakPagedPoolUsage: SIZE_T,
      QuotaPagedPoolUsage: SIZE_T,
      QuotaPeakNonPagedPoolUsage: SIZE_T,
      QuotaNonPagedPoolUsage: SIZE_T,
      PagefileUsage: SIZE_T,
      PeakPagefileUsage: SIZE_T
    });

    OpenProcess = kernel32.func('OpenProcess', HANDLE, ['uint32_t', 'int', 'uint32_t']);
    CloseHandle = kernel32.func('CloseHandle', BOOL, [HANDLE]);
    GetProcessMemoryInfo = psapi.func('GetProcessMemoryInfo', BOOL, [HANDLE, koffi.pointer(PROCESS_MEMORY_COUNTERS), 'uint32_t']);
    isKoffiLoaded = true;
  } catch (e) {
    // Gracefully ignore loading failure if koffi is not installed
  }
}

export interface TestCaseResult {
  index: number;
  status: 'AC' | 'WA' | 'TLE' | 'RE';
  durationMs: number;
  actualOutput: string;
  expectedOutput: string;
  errorOutput?: string;
  firstDiffLine?: number;
  memoryByte?: number;
}

export interface RunAllTestsResult {
  success: boolean;
  compileError?: string;
  results: TestCaseResult[];
}

/**
 * Resolves the absolute path to a task directory.
 */
export function resolveTaskDirectory(workspaceRoot: string, taskArg?: string): string {
  const cwd = process.cwd();
  
  if (taskArg) {
    const pathFromCwd = path.resolve(cwd, taskArg);
    if (fs.existsSync(pathFromCwd) && fs.statSync(pathFromCwd).isDirectory()) {
      return pathFromCwd;
    }
    
    const pathFromRoot = path.resolve(workspaceRoot, taskArg);
    if (fs.existsSync(pathFromRoot) && fs.statSync(pathFromRoot).isDirectory()) {
      return pathFromRoot;
    }

    const config = loadConfig(workspaceRoot);
    if (config.contestDir) {
      const pathFromConfigDir = path.resolve(workspaceRoot, config.contestDir, taskArg);
      if (fs.existsSync(pathFromConfigDir) && fs.statSync(pathFromConfigDir).isDirectory()) {
        return pathFromConfigDir;
      }
    }

    const labelPath = path.join(cwd, taskArg);
    if (fs.existsSync(labelPath) && fs.statSync(labelPath).isDirectory()) {
      return labelPath;
    }

    throw new AtcError(`Task directory "${taskArg}" not found.`);
  }

  if (path.resolve(cwd) === path.resolve(workspaceRoot)) {
    throw new AtcError('You are in the workspace root. Please specify a task directory (e.g., "atc test abc300/a").');
  }

  return cwd;
}

/**
 * Detects the code file to execute in the task directory.
 */
export function detectCodeFile(
  workspaceRoot: string,
  taskDir: string,
  config: Config,
  fileArg?: string
): { codeFile: string; langKey: string; langConfig: LanguageConfig } {
  if (fileArg) {
    const fullPath = path.resolve(taskDir, fileArg);
    if (!fs.existsSync(fullPath)) {
      throw new AtcError(`Specified source file "${fileArg}" not found in "${taskDir}"`);
    }
    
    const ext = path.extname(fileArg).slice(1);
    for (const [key, langConfig] of Object.entries(config.languages)) {
      if (langConfig.extension === ext) {
        return { codeFile: fileArg, langKey: key, langConfig };
      }
    }
    throw new AtcError(`No language configuration found for file extension ".${ext}"`);
  }

  const files = fs.readdirSync(taskDir);
  
  const defLang = config.languages[config.defaultLanguage];
  if (defLang) {
    if (defLang.submitFile) {
      const submitFilePath = path.join(taskDir, defLang.submitFile);
      if (fs.existsSync(submitFilePath) && fs.statSync(submitFilePath).isFile()) {
        return { codeFile: defLang.submitFile, langKey: config.defaultLanguage, langConfig: defLang };
      }
    }
    const matchedFile = files.find(f => f.endsWith(`.${defLang.extension}`) && fs.statSync(path.join(taskDir, f)).isFile());
    if (matchedFile) {
      return { codeFile: matchedFile, langKey: config.defaultLanguage, langConfig: defLang };
    }
  }

  for (const [key, langConfig] of Object.entries(config.languages)) {
    if (key === config.defaultLanguage) continue;
    if (langConfig.submitFile) {
      const submitFilePath = path.join(taskDir, langConfig.submitFile);
      if (fs.existsSync(submitFilePath) && fs.statSync(submitFilePath).isFile()) {
        return { codeFile: langConfig.submitFile, langKey: key, langConfig };
      }
    }
    const matchedFile = files.find(f => f.endsWith(`.${langConfig.extension}`) && fs.statSync(path.join(taskDir, f)).isFile());
    if (matchedFile) {
      return { codeFile: matchedFile, langKey: key, langConfig: langConfig };
    }
  }

  throw new AtcError(`No source files found in "${taskDir}" matching configured languages.`);
}

/**
 * Resolves the build and run commands by substituting template filenames with the actual filename.
 */
export function resolveCommands(
  workspaceRoot: string,
  langConfig: LanguageConfig,
  actualFile: string,
  extension: string
): { build: string; run: string } {
  return {
    build: langConfig.build,
    run: langConfig.run
  };
}

/**
 * Runs the build command if present.
 */
export function runBuild(buildCommand: string, taskDir: string): Promise<{ code: number; stderr: string }> {
  return new Promise((resolve) => {
    exec(buildCommand, { cwd: taskDir }, (err, stdout, stderr) => {
      resolve({
        code: err ? (err.code ?? 1) : 0,
        stderr: stderr || stdout
      });
    });
  });
}

/**
 * Parses a command line string into a command and an array of arguments,
 * respecting double and single quotes.
 */
function parseCommandString(cmdStr: string): { command: string; args: string[] } {
  const parts: string[] = [];
  let current = '';
  let inDoubleQuote = false;
  let inSingleQuote = false;

  for (let i = 0; i < cmdStr.length; i++) {
    const char = cmdStr[i];
    if (char === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
    } else if (char === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
    } else if (char === ' ' && !inDoubleQuote && !inSingleQuote) {
      if (current !== '') {
        parts.push(current);
        current = '';
      }
    } else {
      current += char;
    }
  }
  if (current !== '') {
    parts.push(current);
  }

  return {
    command: parts[0] || '',
    args: parts.slice(1)
  };
}

/**
 * Warms up the execution environment by spawning the run command once,
 * immediately ending stdin, to bypass initial VM initialization and
 * OS-level execution overheads (like Gatekeeper on macOS).
 */
/**
 * Resolves relative command paths (e.g. ./a.out) to absolute paths relative to taskDir
 * to avoid OS path resolution overhead and potential spawn errors.
 */
function resolveSpawnCommand(command: string, taskDir: string): string {
  if (command.startsWith('./') || command.startsWith('../') || command.includes('/') || command.includes('\\')) {
    return path.resolve(taskDir, command);
  }
  return command;
}

/**
 * Warms up the execution environment by spawning the run command once,
 * immediately ending stdin, to bypass initial VM initialization and
 * OS-level execution overheads (like Gatekeeper on macOS).
 */
function warmupCommand(runCommand: string, taskDir: string): Promise<void> {
  return new Promise((resolve) => {
    try {
      const { command, args } = parseCommandString(runCommand);
      const resolvedCommand = resolveSpawnCommand(command, taskDir);
      const child = spawn(resolvedCommand, args, {
        cwd: taskDir,
        shell: false
      });
      
      child.stdin.end();
      child.stdout.on('data', () => {});
      child.stderr.on('data', () => {});
      
      const timer = setTimeout(() => {
        child.kill('SIGKILL');
        resolve();
      }, 500);

      child.on('error', () => {
        clearTimeout(timer);
        resolve();
      });
      child.on('exit', () => {
        clearTimeout(timer);
        resolve();
      });
    } catch {
      resolve();
    }
  });
}

/**
 * Runs a single test case.
 */
export function runTestCase(
  runCommand: string,
  taskDir: string,
  inputPath: string,
  outputPath: string,
  timeLimitMs: number,
  index: number
): Promise<TestCaseResult> {
  return new Promise((resolve) => {
    const input = fs.readFileSync(inputPath, 'utf8');
    const expected = fs.readFileSync(outputPath, 'utf8');
    
    let startTime = process.hrtime.bigint();
    
    const { command, args } = parseCommandString(runCommand);
    const resolvedCommand = resolveSpawnCommand(command, taskDir);

    let spawnCommand = resolvedCommand;
    let spawnArgs = args;

    const useBsdTime = process.platform === 'darwin' && fs.existsSync('/usr/bin/time');
    const useGnuTime = process.platform === 'linux' && fs.existsSync('/usr/bin/time');

    if (useBsdTime) {
      spawnCommand = '/usr/bin/time';
      spawnArgs = ['-l', resolvedCommand, ...args];
    } else if (useGnuTime) {
      spawnCommand = '/usr/bin/time';
      spawnArgs = ['-v', resolvedCommand, ...args];
    }

    let procHandle: any = null;
    const PROCESS_QUERY_INFORMATION = 0x0400;
    const PROCESS_VM_READ = 0x0010;

    const child = spawn(spawnCommand, spawnArgs, {
      cwd: taskDir,
      shell: false
    });

    child.on('spawn', () => {
      startTime = process.hrtime.bigint();
      if (process.platform === 'win32' && isKoffiLoaded && child.pid) {
        try {
          procHandle = OpenProcess(PROCESS_QUERY_INFORMATION | PROCESS_VM_READ, 0, child.pid);
        } catch (e) {
          // ignore
        }
      }
    });
    
    let stdout = '';
    let stderr = '';
    let killedByTimeout = false;
    
    const timer = setTimeout(() => {
      killedByTimeout = true;
      child.kill('SIGKILL');
    }, timeLimitMs);
    
    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    child.on('error', (err) => {
      clearTimeout(timer);
      const endTime = process.hrtime.bigint();
      const durationMs = Number(endTime - startTime) / 1e6;
      if (process.platform === 'win32' && isKoffiLoaded && procHandle) {
        try {
          CloseHandle(procHandle);
        } catch (e) {}
      }
      resolve({
        index,
        status: 'RE',
        durationMs,
        actualOutput: stdout,
        expectedOutput: expected,
        errorOutput: err.message
      });
    });
    
    child.on('exit', (code, signal) => {
      clearTimeout(timer);
      const endTime = process.hrtime.bigint();
      const durationMs = Number(endTime - startTime) / 1e6;
      
      let memoryByte: number | undefined;

      // Windows memory measurement
      if (process.platform === 'win32' && isKoffiLoaded && procHandle) {
        try {
          const counters = {
            cb: koffi.sizeof(PROCESS_MEMORY_COUNTERS),
            PageFaultCount: 0,
            PeakWorkingSetSize: 0,
            WorkingSetSize: 0,
            QuotaPeakPagedPoolUsage: 0,
            QuotaPagedPoolUsage: 0,
            QuotaPeakNonPagedPoolUsage: 0,
            QuotaNonPagedPoolUsage: 0,
            PagefileUsage: 0,
            PeakPagefileUsage: 0
          };
          const success = GetProcessMemoryInfo(procHandle, counters, counters.cb);
          if (success) {
            memoryByte = counters.PeakWorkingSetSize;
          }
        } catch (e) {
          // ignore
        } finally {
          try {
            CloseHandle(procHandle);
          } catch (e) {}
        }
      }

      // macOS / Linux memory measurement & stderr cleansing
      if (useBsdTime) {
        const startMatch = stderr.match(/^\s*\d+\.\d+\s+real\s+\d+\.\d+\s+user\s+\d+\.\d+\s+sys\s*$/m);
        if (startMatch && startMatch.index !== undefined) {
          const timeOutput = stderr.substring(startMatch.index);
          stderr = stderr.substring(0, startMatch.index);
          const memMatch = timeOutput.match(/^\s*(\d+)\s+maximum resident set size/m);
          if (memMatch) {
            memoryByte = parseInt(memMatch[1], 10);
          }
        }
      } else if (useGnuTime) {
        const startIdx = stderr.indexOf('Command being timed:');
        if (startIdx !== -1) {
          const timeOutput = stderr.substring(startIdx);
          stderr = stderr.substring(0, startIdx);
          const memMatch = timeOutput.match(/Maximum resident set size \(kbytes\):\s*(\d+)/);
          if (memMatch) {
            memoryByte = parseInt(memMatch[1], 10) * 1024;
          }
        }
      }
      
      if (killedByTimeout || signal === 'SIGKILL') {
        resolve({
          index,
          status: 'TLE',
          durationMs,
          actualOutput: stdout,
          expectedOutput: expected,
          errorOutput: 'Time Limit Exceeded',
          memoryByte
        });
        return;
      }
      
      if (code !== 0) {
        resolve({
          index,
          status: 'RE',
          durationMs,
          actualOutput: stdout,
          expectedOutput: expected,
          errorOutput: stderr || `Exit code ${code}`,
          memoryByte
        });
        return;
      }
      
      const comp = compareOutput(stdout, expected);
      resolve({
        index,
        status: comp.isMatch ? 'AC' : 'WA',
        durationMs,
        actualOutput: stdout,
        expectedOutput: expected,
        firstDiffLine: comp.firstDiffLine,
        memoryByte
      });
    });
    
    child.stdin.write(input);
    child.stdin.end();
  });
}

export async function runAllTests(
  workspaceRoot: string,
  taskDir: string,
  fileArg?: string,
  timeLimitMs: number = 2000
): Promise<RunAllTestsResult> {
  const config = loadConfig(workspaceRoot);
  const { codeFile, langConfig } = detectCodeFile(workspaceRoot, taskDir, config, fileArg);
  const { build, run } = resolveCommands(workspaceRoot, langConfig, codeFile, langConfig.extension);

  if (build.trim() !== '') {
    const buildRes = await runBuild(build, taskDir);
    if (buildRes.code !== 0) {
      return {
        success: false,
        compileError: buildRes.stderr,
        results: []
      };
    }
  }

  const testDirName = config.testDirName || 'tests';
  const testDir = path.join(taskDir, testDirName);
  
  if (!fs.existsSync(testDir) || !fs.statSync(testDir).isDirectory()) {
    throw new AtcError(`Test directory "${testDir}" not found.`);
  }

  const files = fs.readdirSync(testDir);
  const inFiles = files.filter(f => f.startsWith('sample-') && f.endsWith('.in'));
  
  const results: TestCaseResult[] = [];
  
  inFiles.sort((a, b) => {
    const aIdx = parseInt(a.match(/sample-(\d+)\.in/)![1], 10);
    const bIdx = parseInt(b.match(/sample-(\d+)\.in/)![1], 10);
    return aIdx - bIdx;
  });

  // Warm up the execution to avoid initial overhead (Node.js spawn, Gatekeeper scans, etc.)
  await warmupCommand(run, taskDir);

  for (const inFile of inFiles) {
    const match = inFile.match(/sample-(\d+)\.in/);
    if (!match) continue;
    const index = parseInt(match[1], 10);
    const inputPath = path.join(testDir, inFile);
    const outputPath = path.join(testDir, `sample-${index}.out`);

    if (!fs.existsSync(outputPath)) {
      continue;
    }

    const testRes = await runTestCase(run, taskDir, inputPath, outputPath, timeLimitMs, index);
    results.push(testRes);
  }

  const success = results.length > 0 && results.every(r => r.status === 'AC');

  return {
    success,
    results
  };
}
