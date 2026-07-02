import * as fs from 'fs';
import * as path from 'path';
import { WorkspaceNotFoundError } from '../utils/errors';

/**
 * Finds the absolute path to the `.atcoder-next/` directory by traversing upwards
 * from the starting directory (defaults to process.cwd()).
 * 
 * @param startDir The directory to start searching from.
 * @returns The absolute path to the `.atcoder-next` directory.
 * @throws WorkspaceNotFoundError if the `.atcoder-next` directory is not found.
 */
export function findWorkspaceRoot(startDir: string = process.cwd()): string {
  let currentDir = path.resolve(startDir);
  
  while (true) {
    const targetPath = path.join(currentDir, '.atcoder-next');
    if (fs.existsSync(targetPath) && fs.statSync(targetPath).isDirectory()) {
      return currentDir;
    }
    
    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      // Reached the root directory
      throw new WorkspaceNotFoundError();
    }
    currentDir = parentDir;
  }
}
