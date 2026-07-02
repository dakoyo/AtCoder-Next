import { describe, it, expect } from 'vitest';
import { parseSubmissionStatus } from './submission-status';

const MOCK_SUBMISSION_WJ = `
<table>
  <tr><th>Status</th><td id="judge-status">12/15 WJ</td></tr>
  <tr><th>Score</th><td>0</td></tr>
</table>
`;

const MOCK_SUBMISSION_AC = `
<table>
  <tr><th>Status</th><td id="judge-status"><span class="label label-success">AC</span></td></tr>
  <tr><th>Execution Time</th><td>15 ms</td></tr>
  <tr><th>Memory</th><td>2048 KB</td></tr>
  <tr><th>Score</th><td>100</td></tr>
</table>
`;

describe('submission-status parser', () => {
  it('should parse WJ state correctly', () => {
    const res = parseSubmissionStatus(MOCK_SUBMISSION_WJ);
    expect(res.status).toBe('12/15 WJ');
    expect(res.isCompleted).toBe(false);
    expect(res.score).toBe('0');
  });

  it('should parse AC state correctly', () => {
    const res = parseSubmissionStatus(MOCK_SUBMISSION_AC);
    expect(res.status).toBe('AC');
    expect(res.isCompleted).toBe(true);
    expect(res.time).toBe('15 ms');
    expect(res.memory).toBe('2048 KB');
    expect(res.score).toBe('100');
  });
});
