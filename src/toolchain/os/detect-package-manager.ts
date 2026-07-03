import { OS, PackageManager } from '../types';
import { commandExists } from '../detector';

export function detectPackageManagers(os: OS): PackageManager[] {
  const managers: PackageManager[] = [];
  if (os === 'macos') {
    if (commandExists('brew')) managers.push('brew');
  } else if (os === 'windows') {
    if (commandExists('winget')) managers.push('winget');
    if (commandExists('scoop')) managers.push('scoop');
  } else if (os === 'linux') {
    if (commandExists('apt-get') || commandExists('apt')) managers.push('apt');
    if (commandExists('dnf')) managers.push('dnf');
    if (commandExists('pacman')) managers.push('pacman');
    if (commandExists('brew')) managers.push('brew');
  }
  return managers;
}
