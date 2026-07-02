import { describe, it, expect } from 'vitest';
import { parseContestTasks } from './contest-tasks';

const MOCK_CONTEST_TASKS_HTML = `
<table>
  <thead>
    <tr><th>Task</th><th>Task Name</th></tr>
  </thead>
  <tbody>
    <tr>
      <td><a href="/contests/abc300/tasks/abc300_a">A</a></td>
      <td><a href="/contests/abc300/tasks/abc300_a">Bitwise XOR</a></td>
    </tr>
    <tr>
      <td><a href="/contests/abc300/tasks/abc300_b">B</a></td>
      <td><a href="/contests/abc300/tasks/abc300_b">Grid Rotations</a></td>
    </tr>
  </tbody>
</table>
`;

describe('contest-tasks parser', () => {
  it('should parse task list correctly', () => {
    const tasks = parseContestTasks(MOCK_CONTEST_TASKS_HTML);
    expect(tasks).toHaveLength(2);
    expect(tasks[0]).toEqual({
      id: 'abc300_a',
      label: 'a',
      url: '/contests/abc300/tasks/abc300_a'
    });
    expect(tasks[1]).toEqual({
      id: 'abc300_b',
      label: 'b',
      url: '/contests/abc300/tasks/abc300_b'
    });
  });
});
