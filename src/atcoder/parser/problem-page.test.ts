import { describe, it, expect } from 'vitest';
import { parseProblemPage } from './problem-page';

const MOCK_PROBLEM_HTML = `
<!DOCTYPE html>
<html>
<head>
  <title>A - ABC Problem</title>
</head>
<body>
  <span class="h2">A - ABC Problem</span>
  <div id="task-statement">
    <p>Time Limit: 2 sec / Memory Limit: 1024 MB</p>
    <span class="lang-en">
      <div class="part">
        <h3>Sample Input 1</h3>
        <pre>1 2
3</pre>
      </div>
      <div class="part">
        <h3>Sample Output 1</h3>
        <pre>6</pre>
      </div>
      <div class="part">
        <h3>Sample Input 2</h3>
        <pre>10 20
30</pre>
      </div>
      <div class="part">
        <h3>Sample Output 2</h3>
        <pre>60</pre>
      </div>
    </span>
    <span class="lang-ja">
      <div class="part">
        <h3>入力例 1</h3>
        <pre>1 2
3</pre>
      </div>
      <div class="part">
        <h3>出力例 1</h3>
        <pre>6</pre>
      </div>
    </span>
  </div>
</body>
</html>
`;

describe('problem-page parser', () => {
  it('should parse details correctly', () => {
    const details = parseProblemPage(MOCK_PROBLEM_HTML);
    expect(details.title).toBe('A - ABC Problem');
    expect(details.timeLimitMs).toBe(2000);
    expect(details.memoryLimitBytes).toBe(1024 * 1024 * 1024);
    expect(details.samples).toHaveLength(2);
    expect(details.samples[0]).toEqual({
      index: 1,
      input: '1 2\n3\n',
      output: '6\n'
    });
    expect(details.samples[1]).toEqual({
      index: 2,
      input: '10 20\n30\n',
      output: '60\n'
    });
    expect(details.problemStatementMd).toContain('# A - ABC Problem');
    expect(details.problemStatementMd).toContain('### Sample Input 1');
  });

  it('should parse Japanese problem statement with preferredLang ja', () => {
    const details = parseProblemPage(MOCK_PROBLEM_HTML, 'ja');
    expect(details.problemStatementMd).toContain('### 入力例 1');
    expect(details.problemStatementMd).not.toContain('### Sample Input 1');
  });

  it('should preserve LaTeX formatting without escaping math expressions', () => {
    const htmlWithLatex = `
      <div id="task-statement">
        <span class="lang-en">
          <p>Given $N$ integers $A_1, A_2, \\dots, A_N$.</p>
          <p>Find $$ \\sum_{i=1}^N A_i $$.</p>
          <p>Constraints: $1 \\le N \\le 100$ and $A_i \\le 1000$ with some _underscores_ outside and grid cell # symbols.</p>
        </span>
      </div>
    `;
    const details = parseProblemPage(htmlWithLatex);
    expect(details.problemStatementMd).toContain('Given $N$ integers $A_1, A_2, \\dots, A_N$.');
    expect(details.problemStatementMd).toContain('Find $$\n\\sum_{i=1}^N A_i\n$$.');
    expect(details.problemStatementMd).toContain('Constraints: $1 \\le N \\le 100$ and $A_i \\le 1000$');
    expect(details.problemStatementMd).toContain('\\_underscores\\_');
    expect(details.problemStatementMd).toContain('grid cell # symbols');
  });

  it('should translate \\( and \\[] delimiters to $ and $$, and keep content unescaped', () => {
    const htmlWithLatex = `
      <div id="task-statement">
        <span class="lang-en">
          <p>Given \\(T_i\\) for all \\(i\\).</p>
          <p>Find \\[ \\sum_{i=1}^N T_i \\].</p>
          <p>Constraints: \\(1 \\le N,Q \\le 1000\\).</p>
        </span>
      </div>
    `;
    const details = parseProblemPage(htmlWithLatex);
    expect(details.problemStatementMd).toContain('Given $T_i$ for all $i$.');
    expect(details.problemStatementMd).toContain('$$\n\\sum_{i=1}^N T_i\n$$');
    expect(details.problemStatementMd).toContain('Constraints: $1 \\le N,Q \\le 1000$.');
  });

  it('should convert <var> and span.math tags to $ math blocks and keep content unescaped', () => {
    const htmlWithVar = `
      <div id="task-statement">
        <span class="lang-en">
          <p>Let <var>N</var> be the number of elements.</p>
          <p>Constraints: <ul><li><var>1 \\le N \\le 300</var></li><li><span class="math">A_i \\le 1000</span></li></ul></p>
        </span>
      </div>
    `;
    const details = parseProblemPage(htmlWithVar);
    expect(details.problemStatementMd).toContain('Let $N$ be the number of elements.');
    expect(details.problemStatementMd).toContain('- $1 \\le N \\le 300$');
    expect(details.problemStatementMd).toContain('- $A_i \\le 1000$');
  });

  it('should format <pre> blocks containing math or var tags as LaTeX array block', () => {
    const htmlWithPre = `
      <div id="task-statement">
        <span class="lang-en">
          <h3>Input</h3>
          <pre>
N M
A_1 A_2 ... A_N
:
query_Q
          </pre>
        </span>
      </div>
    `;
    // Add <var> tag to trigger math conversion
    const htmlWithPreVar = htmlWithPre.replace('N M', '<var>N</var> <var>M</var>');
    const details = parseProblemPage(htmlWithPreVar);
    expect(details.problemStatementMd).toContain('\\begin{array}{l}');
    expect(details.problemStatementMd).toContain('\\text{N M}');
    expect(details.problemStatementMd).toContain('\\text{A}_1');
    expect(details.problemStatementMd).toContain('\\dots');
    expect(details.problemStatementMd).toContain('\\vdots');
    expect(details.problemStatementMd).toContain('\\text{query}_Q');
    expect(details.problemStatementMd).toContain('\\end{array}');
  });

  it('should keep standard pre blocks (sample cases) as markdown code blocks', () => {
    const htmlWithStandardPre = `
      <div id="task-statement">
        <span class="lang-en">
          <h3>Sample Input 1</h3>
          <pre>3 125 175
200 300 400</pre>
        </span>
      </div>
    `;
    const details = parseProblemPage(htmlWithStandardPre);
    expect(details.problemStatementMd).toContain('\`\`\`\n3 125 175\n200 300 400\n\`\`\`');
  });

  it('should format pre blocks that already contain LaTeX \\text{} commands correctly', () => {
    const htmlWithPreLaTeX = `
      <div id="task-statement">
        <span class="lang-en">
          <h3>Input</h3>
          <pre>
Q
\\text{query}_1
\\text{query}_2
:
\\text{query}_Q
          </pre>
        </span>
      </div>
    `;
    // Add <var> tag to trigger math conversion
    const htmlWithPreVar = htmlWithPreLaTeX.replace('Q', '<var>Q</var>');
    const details = parseProblemPage(htmlWithPreVar);
    expect(details.problemStatementMd).toContain('\\begin{array}{l}');
    expect(details.problemStatementMd).toContain('\\text{Q}');
    expect(details.problemStatementMd).toContain('\\text{query}_1');
    expect(details.problemStatementMd).toContain('\\text{query}_2');
    expect(details.problemStatementMd).toContain('\\vdots');
    expect(details.problemStatementMd).toContain('\\text{query}_Q');
    expect(details.problemStatementMd).toContain('\\end{array}');
    expect(details.problemStatementMd).not.toContain('\\text\\text');
  });

  it('should format pre blocks with adjacent subscripted variables like s_1s_2s_3 correctly', () => {
    const htmlWithPreAdjacent = `
      <div id="task-statement">
        <span class="lang-en">
          <h3>Input</h3>
          <pre>
s_1s_2s_3
          </pre>
        </span>
      </div>
    `;
    // Add <var> tag to trigger math conversion
    const htmlWithPreVar = htmlWithPreAdjacent.replace('s_1s_2s_3', '<var>s_1s_2s_3</var>');
    const details = parseProblemPage(htmlWithPreVar);
    expect(details.problemStatementMd).toContain('\\text{s}_1\\text{s}_2\\text{s}_3');
  });
});
