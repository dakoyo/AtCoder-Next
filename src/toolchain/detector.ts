import { execSync, exec, spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { getGlobalConfigDir } from '../config';

// Dynamically append MSYS2 path on Windows if it exists, so local detections/runs can locate compilers immediately
if (process.platform === 'win32') {
  const msysPath = 'C:\\msys64\\mingw64\\bin';
  const pathKey = process.env.Path ? 'Path' : 'PATH';
  const currentPath = process.env[pathKey] || '';
  if (currentPath.indexOf(msysPath) === -1) {
    try {
      if (fs.existsSync(msysPath)) {
        process.env[pathKey] = currentPath + ';' + msysPath;
      }
    } catch {}
  }
}

export function commandExists(cmd: string): boolean {
  try {
    const binary = cmd.split(' ')[0];
    const checkCmd = process.platform === 'win32'
      ? `where ${binary}`
      : `command -v ${binary}`;
    execSync(checkCmd, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

export function detectLocalVersion(detectCommand: string, versionRegex: RegExp): string | undefined {
  try {
    const binary = detectCommand.split(' ')[0];
    if (!commandExists(binary)) {
      return undefined;
    }
    // E.g. running 'g++ --version'
    const output = execSync(detectCommand, { stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8' });
    const match = output.match(versionRegex);
    if (match && match[1]) {
      return match[1];
    }
  } catch {
    // ignore
  }
  return undefined;
}

export function runInstallCommand(cmd: string): Promise<{ success: boolean; output: string }> {
  return new Promise((resolve) => {
    const shell = process.platform === 'win32' ? true : '/bin/sh';
    const child = spawn(cmd, {
      shell,
      stdio: 'inherit'
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve({
          success: true,
          output: '[Run in interactive mode. Output printed directly to terminal.]'
        });
      } else {
        resolve({
          success: false,
          output: `[Run in interactive mode. Command exited with code ${code}.]`
        });
      }
    });

    child.on('error', (err) => {
      resolve({
        success: false,
        output: `[Failed to spawn process: ${err.message}]`
      });
    });
  });
}




export function appendToInstallLog(langId: string, cmd: string, success: boolean, output: string): void {
  const logPath = path.join(getGlobalConfigDir(), 'install.log');
  const timestamp = new Date().toISOString();
  const status = success ? 'SUCCESS' : 'FAILED';
  const entry = `[${timestamp}] [Language: ${langId}] [Status: ${status}]\nCommand: ${cmd}\nOutput:\n${output}\n----------------------------------------\n`;
  
  try {
    const dir = path.dirname(logPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.appendFileSync(logPath, entry, 'utf8');
  } catch {
    // ignore logging failures
  }
}

