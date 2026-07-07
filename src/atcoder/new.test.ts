import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { setupTask } from './new';
import { loadConfig, saveConfig, DEFAULT_CONFIG } from '../config';
import { parseProblemPage } from './parser/problem-page';

const { mockGet } = vi.hoisted(() => {
  return { mockGet: vi.fn() };
});

vi.mock('axios', () => {
  const mockInstance = {
    get: mockGet,
    interceptors: {
      request: {
        use: vi.fn(),
        eject: vi.fn()
      },
      response: {
        use: vi.fn(),
        eject: vi.fn()
      }
    }
  };
  return {
    default: {
      create: vi.fn(() => mockInstance),
      get: mockGet
    }
  };
});

vi.mock('../utils/rate-limiter', () => {
  return {
    waitRateLimit: vi.fn()
  };
});

vi.mock('./parser/problem-page', async (importOriginal) => {
  const original = await importOriginal<typeof import('./parser/problem-page')>();
  return {
    ...original,
    parseProblemPage: vi.fn((html, lang) => original.parseProblemPage(html, lang))
  };
});

describe('setupTask problem extraction', () => {
  const tempDir = path.join(__dirname, '../../test-temp-new');

  const DEFAULT_HTML = `
    <span class="h2">A - Test Problem</span>
    <div id="task-statement">
      <span class="lang-en">
        <p>English problem text.</p>
        <h3>Sample Input 1</h3>
        <pre>1 2</pre>
        <h3>Sample Output 1</h3>
        <pre>3</pre>
      </span>
      <span class="lang-ja">
        <p>日本語の問題文。</p>
        <h3>入力例 1</h3>
        <pre>1 2</pre>
        <h3>出力例 1</h3>
        <pre>3</pre>
      </span>
    </div>
  `;

  beforeEach(() => {
    mockGet.mockResolvedValue({
      data: DEFAULT_HTML
    });

    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    fs.mkdirSync(tempDir, { recursive: true });

    // Create .atcoder-next/templates/cpp/main.cpp to avoid errors
    const templatesDir = path.join(tempDir, '.atcoder-next', 'templates', 'cpp');
    fs.mkdirSync(templatesDir, { recursive: true });
    fs.writeFileSync(path.join(templatesDir, 'main.cpp'), '// template', 'utf8');
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should recursively copy template directory contents including subdirectories', async () => {
    const config = {
      ...DEFAULT_CONFIG,
      extractProblemStatement: false
    };
    saveConfig(tempDir, config);

    // Create a subdirectory inside templates/cpp
    const templatesDir = path.join(tempDir, '.atcoder-next', 'templates', 'cpp');
    const subDir = path.join(templatesDir, 'dist');
    fs.mkdirSync(subDir, { recursive: true });
    fs.writeFileSync(path.join(subDir, 'helper.js'), '// helper', 'utf8');

    const task = {
      id: 'abc300_a',
      label: 'a',
      title: 'A - Test Problem'
    };

    const res = await setupTask(tempDir, 'abc300', task);
    expect(res.sampleCount).toBe(1);
    expect(fs.existsSync(path.join(res.taskDir, 'main.cpp'))).toBe(true);
    expect(fs.existsSync(path.join(res.taskDir, 'dist'))).toBe(true);
    expect(fs.existsSync(path.join(res.taskDir, 'dist', 'helper.js'))).toBe(true);
  });

  it('should NOT extract problem statement by default (extractProblemStatement = false)', async () => {
    const config = {
      ...DEFAULT_CONFIG,
      extractProblemStatement: false
    };
    saveConfig(tempDir, config);

    const task = {
      id: 'abc300_a',
      label: 'a',
      title: 'A - Test Problem'
    };

    const res = await setupTask(tempDir, 'abc300', task);
    expect(res.sampleCount).toBe(1);
    expect(fs.existsSync(path.join(res.taskDir, 'problem.md'))).toBe(false);
  });

  it('should extract problem statement if extractProblemStatement = true', async () => {
    const config = {
      ...DEFAULT_CONFIG,
      extractProblemStatement: true,
      problemLang: 'en' as const
    };
    saveConfig(tempDir, config);

    const task = {
      id: 'abc300_a',
      label: 'a',
      title: 'A - Test Problem'
    };

    const res = await setupTask(tempDir, 'abc300', task);
    expect(res.sampleCount).toBe(1);

    const problemMdPath = path.join(res.taskDir, 'problem.md');
    expect(fs.existsSync(problemMdPath)).toBe(true);

    const content = fs.readFileSync(problemMdPath, 'utf8');
    expect(content).toContain('# A - Test Problem');
    expect(content).toContain('English problem text.');
    expect(content).toContain('### Sample Input 1');
  });

  it('should respect problemLang configuration specifically', async () => {
    const config = {
      ...DEFAULT_CONFIG,
      extractProblemStatement: true,
      lang: 'en' as const,
      problemLang: 'ja' as const
    };
    saveConfig(tempDir, config);

    const task = {
      id: 'abc300_a',
      label: 'a',
      title: 'A - Test Problem'
    };

    const res = await setupTask(tempDir, 'abc300', task);
    const content = fs.readFileSync(path.join(res.taskDir, 'problem.md'), 'utf8');
    expect(content).toContain('日本語の問題文。');
    expect(content).not.toContain('English problem text.');
  });

  it('should fallback to lang configuration if problemLang is not specified', async () => {
    const config = {
      ...DEFAULT_CONFIG,
      extractProblemStatement: true,
      lang: 'ja' as const
    };
    saveConfig(tempDir, config);

    const task = {
      id: 'abc300_a',
      label: 'a',
      title: 'A - Test Problem'
    };

    const res = await setupTask(tempDir, 'abc300', task);
    const content = fs.readFileSync(path.join(res.taskDir, 'problem.md'), 'utf8');
    expect(content).toContain('日本語の問題文。');
    expect(content).not.toContain('English problem text.');
  });

  it('should skip problem statement extraction if contest is active', async () => {
    const config = {
      ...DEFAULT_CONFIG,
      extractProblemStatement: true,
      problemLang: 'en' as const
    };
    saveConfig(tempDir, config);

    // Mock HTML with contest duration covering "now"
    const now = new Date();
    const start = new Date(now.getTime() - 60 * 60 * 1000);
    const end = new Date(now.getTime() + 60 * 60 * 1000);
    const toIso = (d: Date) => {
      const pad = (n: number) => String(n).padStart(2, '0');
      const jstTime = new Date(d.getTime() + 9 * 60 * 60 * 1000);
      const y = jstTime.getUTCFullYear();
      const m = pad(jstTime.getUTCMonth() + 1);
      const date = pad(jstTime.getUTCDate());
      const h = pad(jstTime.getUTCHours());
      const min = pad(jstTime.getUTCMinutes());
      return `${y}${m}${date}T${h}${min}`;
    };

    const activeHtml = `
      <span class="h2">A - Test Problem</span>
      <small class="contest-duration">
        Contest Duration:
        <a href="http://www.timeanddate.com/worldclock/fixedtime.html?iso=${toIso(start)}&p1=248"></a>
        -
        <a href="http://www.timeanddate.com/worldclock/fixedtime.html?iso=${toIso(end)}&p1=248"></a>
      </small>
      <div id="task-statement">
        <span class="lang-en">
          <p>English problem text.</p>
          <h3>Sample Input 1</h3>
          <pre>1 2</pre>
          <h3>Sample Output 1</h3>
          <pre>3</pre>
        </span>
      </div>
    `;
    mockGet.mockResolvedValueOnce({ data: activeHtml });

    const task = {
      id: 'abc300_a',
      label: 'a',
      title: 'A - Test Problem'
    };

    const res = await setupTask(tempDir, 'abc300', task);
    expect(res.skippedProblemStatement).toBe(true);
    expect(fs.existsSync(path.join(res.taskDir, 'problem.md'))).toBe(false);
  });

  it('should NOT skip problem statement extraction if contest has ended', async () => {
    const config = {
      ...DEFAULT_CONFIG,
      extractProblemStatement: true,
      problemLang: 'en' as const
    };
    saveConfig(tempDir, config);

    // Mock HTML with contest duration in the past
    const now = new Date();
    const start = new Date(now.getTime() - 120 * 60 * 1000);
    const end = new Date(now.getTime() - 60 * 60 * 1000);
    const toIso = (d: Date) => {
      const pad = (n: number) => String(n).padStart(2, '0');
      const jstTime = new Date(d.getTime() + 9 * 60 * 60 * 1000);
      const y = jstTime.getUTCFullYear();
      const m = pad(jstTime.getUTCMonth() + 1);
      const date = pad(jstTime.getUTCDate());
      const h = pad(jstTime.getUTCHours());
      const min = pad(jstTime.getUTCMinutes());
      return `${y}${m}${date}T${h}${min}`;
    };

    const inactiveHtml = `
      <span class="h2">A - Test Problem</span>
      <small class="contest-duration">
        Contest Duration:
        <a href="http://www.timeanddate.com/worldclock/fixedtime.html?iso=${toIso(start)}&p1=248"></a>
        -
        <a href="http://www.timeanddate.com/worldclock/fixedtime.html?iso=${toIso(end)}&p1=248"></a>
      </small>
      <div id="task-statement">
        <span class="lang-en">
          <p>English problem text.</p>
          <h3>Sample Input 1</h3>
          <pre>1 2</pre>
          <h3>Sample Output 1</h3>
          <pre>3</pre>
        </span>
      </div>
    `;
    mockGet.mockResolvedValueOnce({ data: inactiveHtml });

    const task = {
      id: 'abc300_a',
      label: 'a',
      title: 'A - Test Problem'
    };

    const res = await setupTask(tempDir, 'abc300', task);
    expect(res.skippedProblemStatement).toBe(false);
    expect(fs.existsSync(path.join(res.taskDir, 'problem.md'))).toBe(true);
  });

  it('should throw AtcError if problem statement is extracted while the contest is active (code modification detection)', async () => {
    const config = {
      ...DEFAULT_CONFIG,
      extractProblemStatement: true,
      problemLang: 'en' as const
    };
    saveConfig(tempDir, config);

    // Mock HTML with contest duration covering "now"
    const now = new Date();
    const start = new Date(now.getTime() - 60 * 60 * 1000);
    const end = new Date(now.getTime() + 60 * 60 * 1000);
    const toIso = (d: Date) => {
      const pad = (n: number) => String(n).padStart(2, '0');
      const jstTime = new Date(d.getTime() + 9 * 60 * 60 * 1000);
      const y = jstTime.getUTCFullYear();
      const m = pad(jstTime.getUTCMonth() + 1);
      const date = pad(jstTime.getUTCDate());
      const h = pad(jstTime.getUTCHours());
      const min = pad(jstTime.getUTCMinutes());
      return `${y}${m}${date}T${h}${min}`;
    };

    const activeHtml = `
      <span class="h2">A - Test Problem</span>
      <small class="contest-duration">
        Contest Duration:
        <a href="http://www.timeanddate.com/worldclock/fixedtime.html?iso=${toIso(start)}&p1=248"></a>
        -
        <a href="http://www.timeanddate.com/worldclock/fixedtime.html?iso=${toIso(end)}&p1=248"></a>
      </small>
      <div id="task-statement">
        <span class="lang-en">
          <p>English problem text.</p>
          <h3>Sample Input 1</h3>
          <pre>1 2</pre>
          <h3>Sample Output 1</h3>
          <pre>3</pre>
        </span>
      </div>
    `;
    mockGet.mockResolvedValueOnce({ data: activeHtml });

    // Spy on parseProblemPage and mock its return value to bypass the parser-level skip
    // (Simulating user code modification where problemStatementMd is returned despite being active)
    vi.mocked(parseProblemPage).mockReturnValueOnce({
      title: 'A - Test Problem',
      timeLimitMs: 2000,
      memoryLimitBytes: 1024 * 1024 * 1024,
      samples: [{ index: 1, input: '1 2\n', output: '3\n' }],
      problemStatementMd: '# A - Test Problem\n\nBypassed statement text',
      contestDuration: { start, end }
    });

    const task = {
      id: 'abc300_a',
      label: 'a',
      title: 'A - Test Problem'
    };

    await expect(setupTask(tempDir, 'abc300', task)).rejects.toThrow(
      'Unexpected problem statement extraction during an active contest. Bypassing contest rules is strictly prohibited.'
    );
  });
});
