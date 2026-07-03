import { OS } from '../types';
import * as os from 'os';
import * as fs from 'fs';

export function detectOS(): OS {
  const platform = os.platform();
  if (platform === 'darwin') return 'macos';
  if (platform === 'win32') return 'windows';
  return 'linux'; // Fallback
}

export function getUbuntuVersion(): string | undefined {
  if (detectOS() !== 'linux') return undefined;
  try {
    const release = fs.readFileSync('/etc/os-release', 'utf8');
    const idMatch = release.match(/^ID=(.+)$/m);
    const versionMatch = release.match(/^VERSION_ID=(.+)$/m);
    if (idMatch && idMatch[1].replace(/['"]/g, '').toLowerCase() === 'ubuntu') {
      if (versionMatch) {
        return versionMatch[1].replace(/['"]/g, '');
      }
    }
  } catch {
    // ignore
  }
  return undefined;
}
