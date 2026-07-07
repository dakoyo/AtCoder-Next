import { execSync } from 'child_process';

/**
 * Copies the given text to the system clipboard.
 * Supports macOS (pbcopy), Windows (clip), and Linux (xclip/xsel).
 */
export function writeClipboard(text: string): boolean {
  try {
    if (process.platform === 'darwin') {
      execSync('pbcopy', { input: text });
      return true;
    } else if (process.platform === 'win32') {
      execSync('clip', { input: text });
      return true;
    } else {
      // Linux/other
      try {
        execSync('xclip -selection clipboard', { input: text });
        return true;
      } catch {
        try {
          execSync('xsel --clipboard --input', { input: text });
          return true;
        } catch {
          return false;
        }
      }
    }
  } catch {
    return false;
  }
}
