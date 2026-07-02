import * as fs from 'fs';
import * as path from 'path';
import { createAtCoderClient } from './client';
import { parseContestTasks, TaskInfo } from './parser/contest-tasks';
import { parseProblemPage, SampleCase } from './parser/problem-page';
import { loadConfig } from '../config';
import { AtcError } from '../utils/errors';

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
    throw new AtcError(`Failed to fetch tasks for contest "${contestId}": ${err.message}`);
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
    throw new AtcError(`Language configuration for "${langKey}" not found in settings.json`);
  }

  // Create contest and task directories
  const contestParentDir = config.contestDir ? path.join(workspaceRoot, config.contestDir) : workspaceRoot;
  const contestDir = path.join(contestParentDir, contestId);
  const taskDir = path.join(contestDir, task.label);
  
  if (!fs.existsSync(taskDir)) {
    fs.mkdirSync(taskDir, { recursive: true });
  }

  // Copy template files
  const templateSrcDir = path.join(workspaceRoot, '.atcoder-next', langConfig.templateDir);
  if (fs.existsSync(templateSrcDir) && fs.statSync(templateSrcDir).isDirectory()) {
    const files = fs.readdirSync(templateSrcDir);
    for (const file of files) {
      const srcPath = path.join(templateSrcDir, file);
      const destPath = path.join(taskDir, file);
      if (fs.statSync(srcPath).isFile() && !fs.existsSync(destPath)) {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }

  // Fetch problem page
  const client = createAtCoderClient(workspaceRoot);
  let problemHtml = '';
  try {
    const res = await client.get(`/contests/${contestId}/tasks/${task.id}`);
    problemHtml = res.data;
  } catch (err: any) {
    throw new AtcError(`Failed to fetch problem page for "${task.id}": ${err.message}`);
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
    throw new AtcError('Unexpected problem statement extraction during an active contest. Bypassing contest rules is strictly prohibited.');
  }

  if (config.extractProblemStatement) {
    if (isContestActive) {
      skippedProblemStatement = true;
    } else if (problemDetails.problemStatementMd) {
      fs.writeFileSync(path.join(taskDir, 'problem.md'), problemDetails.problemStatementMd, 'utf8');
    }
  }

  return {
    contestId,
    taskLabel: task.label,
    taskDir,
    sampleCount: problemDetails.samples.length,
    skippedProblemStatement
  };
}
