export interface CompareResult {
  isMatch: boolean;
  actualNormalized: string;
  expectedNormalized: string;
  firstDiffLine?: number; // 1-indexed
}

export function compareOutput(actual: string, expected: string): CompareResult {
  const actualLines = normalizeAndSplit(actual);
  const expectedLines = normalizeAndSplit(expected);

  let isMatch = true;
  let firstDiffLine: number | undefined;

  const maxLines = Math.max(actualLines.length, expectedLines.length);
  for (let i = 0; i < maxLines; i++) {
    if (actualLines[i] !== expectedLines[i]) {
      isMatch = false;
      firstDiffLine = i + 1;
      break;
    }
  }

  return {
    isMatch,
    actualNormalized: actualLines.join('\n'),
    expectedNormalized: expectedLines.join('\n'),
    firstDiffLine
  };
}

function normalizeAndSplit(str: string): string[] {
  const lines = str.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const trimmed = lines.map(line => line.trimEnd());
  
  // Remove trailing empty lines
  while (trimmed.length > 0 && trimmed[trimmed.length - 1] === '') {
    trimmed.pop();
  }
  
  return trimmed;
}
