import { exec, spawn } from 'child_process';

/**
 * Opens the specified URL in the default system web browser.
 */
export function openUrl(url: string): void {
  const cmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
  
  // For Windows, 'start' needs to be run in a shell or with shell: true
  // Let's spawn it safely
  if (process.platform === 'win32') {
    exec(`start "" "${url}"`);
  } else {
    exec(`${cmd} "${url}"`);
  }
}

/**
 * Copies the specified text to the system clipboard.
 */
export function copyToClipboard(text: string): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      let proc;
      if (process.platform === 'darwin') {
        proc = spawn('pbcopy');
      } else if (process.platform === 'win32') {
        proc = spawn('clip');
      } else {
        // Linux fallback (xclip)
        proc = spawn('xclip', ['-selection', 'clipboard']);
      }

      proc.stdin.write(text);
      proc.stdin.end();

      proc.on('close', (code) => {
        resolve(code === 0);
      });
      proc.on('error', () => {
        resolve(false);
      });
    } catch {
      resolve(false);
    }
  });
}
