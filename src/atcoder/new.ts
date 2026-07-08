import * as fs from 'fs';
import * as path from 'path';
import { createAtCoderClient } from './client';
import { parseContestTasks, TaskInfo } from './parser/contest-tasks';
import { parseProblemPage, SampleCase } from './parser/problem-page';
import { loadConfig } from '../config';
import { AtcError } from '../utils/errors';
import { getLocale, t } from '../utils/i18n';

export interface SetupResult {
  contestId: string;
  taskLabel: string;
  taskDir: string;
  sampleCount: number;
  skippedProblemStatement?: boolean;
}

/**
 * Fetches the list of tasks for a given contest.
 */
export async function fetchContestTasks(workspaceRoot: string, contestId: string): Promise<TaskInfo[]> {
  const client = createAtCoderClient(workspaceRoot);
  try {
    const res = await client.get(`/contests/${contestId}/tasks`);
    return parseContestTasks(res.data);
  } catch (err: any) {
    const locale = getLocale(workspaceRoot);
    throw new AtcError(t('newFetchingTasksFailed', locale, contestId, err.message));
  }
}

/**
 * Sets up a single task by downloading sample cases and copying language templates.
 */
export async function setupTask(
  workspaceRoot: string,
  contestId: string,
  task: TaskInfo,
  languageKey?: string
): Promise<SetupResult> {
  const config = loadConfig(workspaceRoot);
  const langKey = languageKey || config.defaultLanguage;
  const langConfig = config.languages[langKey];

  if (!langConfig) {
    const locale = getLocale(workspaceRoot);
    throw new AtcError(t('langConfigNotFound', locale, langKey));
  }

  // Create contest and task directories
  const contestParentDir = config.contestDir ? path.join(workspaceRoot, config.contestDir) : workspaceRoot;
  const contestDir = path.join(contestParentDir, contestId);
  const taskDir = path.join(contestDir, task.label);
  
  if (!fs.existsSync(taskDir)) {
    fs.mkdirSync(taskDir, { recursive: true });
  }

  // Copy template files recursively
  const templateSrcDir = path.join(workspaceRoot, '.atcoder-next', langConfig.templateDir);
  if (fs.existsSync(templateSrcDir) && fs.statSync(templateSrcDir).isDirectory()) {
    copyDirRecursive(templateSrcDir, taskDir);
  }

  // Fetch problem page
  const client = createAtCoderClient(workspaceRoot);
  let problemHtml = '';
  try {
    const res = await client.get(`/contests/${contestId}/tasks/${task.id}`);
    problemHtml = res.data;
  } catch (err: any) {
    const locale = getLocale(workspaceRoot);
    throw new AtcError(t('newFetchingProblemPageFailed', locale, task.id, err.message));
  }

  const preferredProblemLang = config.problemLang || config.lang;
  const problemDetails = parseProblemPage(problemHtml, preferredProblemLang);

  // Write sample cases to tests/ directory
  const testDirName = config.testDirName || 'tests';
  const testDir = path.join(taskDir, testDirName);
  
  if (fs.existsSync(testDir)) {
    // Clear existing sample files to avoid mixing old/new samples
    const files = fs.readdirSync(testDir);
    for (const file of files) {
      if (file.startsWith('sample-')) {
        fs.unlinkSync(path.join(testDir, file));
      }
    }
  } else {
    fs.mkdirSync(testDir, { recursive: true });
  }

  for (const sample of problemDetails.samples) {
    fs.writeFileSync(path.join(testDir, `sample-${sample.index}.in`), sample.input, 'utf8');
    fs.writeFileSync(path.join(testDir, `sample-${sample.index}.out`), sample.output, 'utf8');
  }

  // Write problem statement if enabled in config
  let skippedProblemStatement = false;

  let isContestActive = false;
  if (problemDetails.contestDuration) {
    const now = new Date();
    isContestActive = now >= problemDetails.contestDuration.start && now <= problemDetails.contestDuration.end;
  }

  // Detect code modification / bypass attempt
  if (isContestActive && problemDetails.problemStatementMd) {
    const locale = getLocale(workspaceRoot);
    throw new AtcError(t('newStatementBypassProhibited', locale));
  }

  if (config.extractProblemStatement) {
    if (isContestActive) {
      skippedProblemStatement = true;
    } else if (problemDetails.problemStatementMd) {
      fs.writeFileSync(path.join(taskDir, 'problem.md'), problemDetails.problemStatementMd, 'utf8');
    }
  }

  // Save metadata to .atcoder-next/contest-metadata.json
  const metadataPath = path.join(workspaceRoot, '.atcoder-next', 'contest-metadata.json');
  let metadata: any = { tasks: {} };
  if (fs.existsSync(metadataPath)) {
    try {
      metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
    } catch {}
  }
  if (!metadata.tasks) {
    metadata.tasks = {};
  }
  const taskKey = `${contestId}/${task.label}`.toLowerCase();
  metadata.tasks[taskKey] = {
    timeLimitMs: problemDetails.timeLimitMs || 2000,
    memoryLimitMb: problemDetails.memoryLimitBytes ? Math.round(problemDetails.memoryLimitBytes / (1024 * 1024)) : 1024
  };
  try {
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf8');
  } catch {}

  return {
    contestId,
    taskLabel: task.label,
    taskDir,
    sampleCount: problemDetails.samples.length,
    skippedProblemStatement
  };
}

function copyDirRecursive(src: string, dest: string): void {
  if (!fs.existsSync(src)) return;
  const stats = fs.statSync(src);
  if (stats.isDirectory()) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    const children = fs.readdirSync(src);
    for (const child of children) {
      copyDirRecursive(path.join(src, child), path.join(dest, child));
    }
  } else {
    if (!fs.existsSync(dest)) {
      fs.copyFileSync(src, dest);
    }
  }
}
