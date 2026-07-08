import * as fs from 'fs';
import * as path from 'path';
import { loadConfig } from '../config';
import { AtcError } from '../utils/errors';
import { getLocale, t } from '../utils/i18n';

export function inferContestIdFromCwd(cwd: string, workspaceRoot: string, contestDir: string): string | null {
  const resolvedContestDir = contestDir ? path.resolve(workspaceRoot, contestDir) : workspaceRoot;
  const relative = path.relative(resolvedContestDir, cwd);
  if (relative && !relative.startsWith('..') && !path.isAbsolute(relative)) {
    const parts = relative.replace(/\\/g, '/').split('/');
    if (parts.length >= 1 && parts.length <= 3 && parts[0] !== '') {
      const ignoredDirs = ['src', 'dist', 'node_modules', '.git', '.github', 'test', 'docs', 'tests'];
      if (!ignoredDirs.includes(parts[0].toLowerCase())) {
        return parts[0];
      }
    }
  }
  return null;
}

export function inferTaskLabelFromCwd(cwd: string, workspaceRoot: string, contestDir: string): string | null {
  const resolvedContestDir = contestDir ? path.resolve(workspaceRoot, contestDir) : workspaceRoot;
  const relative = path.relative(resolvedContestDir, cwd);
  if (relative && !relative.startsWith('..') && !path.isAbsolute(relative)) {
    const parts = relative.replace(/\\/g, '/').split('/');
    if (parts.length >= 2) {
      return parts[1];
    }
  }
  return null;
}

export function resolveArgs(
  workspaceRoot: string,
  contestIdOrTask: string | undefined,
  taskLabelArg: string | undefined,
  options?: { file?: string; allowNonExistent?: boolean }
) {
  const cwd = process.cwd();
  const locale = getLocale(workspaceRoot);
  const config = loadConfig(workspaceRoot);
  const contestDir = config.contestDir || '';

  let contestId = '';
  let taskLabel = '';

  if (contestIdOrTask && taskLabelArg) {
    contestId = contestIdOrTask;
    taskLabel = taskLabelArg;
  } else if (contestIdOrTask) {
    if (contestIdOrTask.includes('/')) {
      const parts = contestIdOrTask.split('/');
      contestId = parts[0];
      taskLabel = parts[1];
    } else {
      const cwdContestId = inferContestIdFromCwd(cwd, workspaceRoot, contestDir);
      if (cwdContestId) {
        contestId = cwdContestId;
        taskLabel = contestIdOrTask;
      } else {
        contestId = contestIdOrTask;
        taskLabel = '';
      }
    }
  } else {
    contestId = inferContestIdFromCwd(cwd, workspaceRoot, contestDir) || '';
    taskLabel = inferTaskLabelFromCwd(cwd, workspaceRoot, contestDir) || '';
  }

  let resolvedTaskDir = '';
  if (contestId && taskLabel) {
    resolvedTaskDir = path.resolve(workspaceRoot, contestDir, contestId, taskLabel);
  } else if (contestId) {
    resolvedTaskDir = path.resolve(workspaceRoot, contestDir, contestId);
  } else {
    resolvedTaskDir = workspaceRoot;
  }

  if (!options?.allowNonExistent) {
    if (!contestId) {
      if (path.resolve(cwd) === path.resolve(workspaceRoot)) {
        throw new AtcError(t('utilsInWorkspaceRoot', locale));
      }
      throw new AtcError(t('utilsNoContestId', locale));
    }
    if (!taskLabel) {
      throw new AtcError(t('utilsNoTaskLabel', locale));
    }
    if (!fs.existsSync(resolvedTaskDir)) {
      throw new AtcError(t('utilsTaskDirNotFound', locale, resolvedTaskDir));
    }
  }

  const resolvedFile = options?.file;

  return { resolvedTaskDir, resolvedFile, taskLabel, contestId };
}
