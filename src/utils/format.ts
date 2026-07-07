import pc from 'picocolors';

/**
 * Formats multi-line output with line numbers, a left border,
 * a mismatch pointer, and smart truncation for large outputs.
 */
export function formatOutputLines(output: string, firstDiffLine?: number): string[] {
  if (output === undefined || output === null) {
    return [`   ${pc.gray('│')}   ${pc.dim('(no output)')}`];
  }

  const rawLines = output.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const lines = [...rawLines];
  
  // Remove last empty line if it is just a trailing newline
  if (lines.length > 0 && lines[lines.length - 1] === '') {
    lines.pop();
  }

  if (lines.length === 0) {
    return [`   ${pc.gray('│')}   ${pc.dim('(empty)')}`];
  }

  const totalLines = lines.length;
  const border = pc.gray('│');
  const sep = pc.gray('│');
  
  // Decide which lines to show (window around the first mismatch)
  const maxDisplay = 24;
  let showLines = lines.map((line, idx) => ({ line, lineNum: idx + 1 }));
  let truncatedBefore = false;
  let truncatedAfter = false;
  let truncatedBeforeCount = 0;
  let truncatedAfterCount = 0;

  if (totalLines > maxDisplay) {
    const diffIdx = firstDiffLine ? firstDiffLine - 1 : 0;
    let start = Math.max(0, diffIdx - Math.floor(maxDisplay / 2));
    let end = Math.min(totalLines, start + maxDisplay);
    if (end - start < maxDisplay) {
      start = Math.max(0, end - maxDisplay);
    }
    showLines = showLines.slice(start, end);
    if (start > 0) {
      truncatedBefore = true;
      truncatedBeforeCount = start;
    }
    if (end < totalLines) {
      truncatedAfter = true;
      truncatedAfterCount = totalLines - end;
    }
  }

  const lineNumWidth = String(totalLines).length;
  const result: string[] = [];

  if (truncatedBefore) {
    result.push(`   ${border}   ${pc.dim(`... (truncated ${truncatedBeforeCount} lines)`)}`);
  }

  for (const item of showLines) {
    const isMismatch = item.lineNum === firstDiffLine;
    const lineContent = isMismatch ? pc.yellow(item.line) : item.line;

    if (totalLines === 1) {
      result.push(`   ${border}   ${lineContent}`);
    } else {
      const lineNumStr = String(item.lineNum).padStart(lineNumWidth);
      const prefix = isMismatch ? pc.yellow('>') : ' ';
      const numColor = isMismatch ? pc.yellow : pc.gray;
      result.push(`   ${border} ${prefix} ${numColor(lineNumStr)} ${sep} ${lineContent}`);
    }
  }

  if (truncatedAfter) {
    result.push(`   ${border}   ${pc.dim(`... (truncated ${truncatedAfterCount} lines)`)}`);
  }

  return result;
}

/**
 * Formats error output with red text, a left border, and clean indents.
 */
export function formatErrorOutputLines(errorOutput: string): string[] {
  if (!errorOutput) {
    return [];
  }
  const lines = errorOutput.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  if (lines.length > 0 && lines[lines.length - 1] === '') {
    lines.pop();
  }
  const border = pc.gray('│');
  return lines.map(line => `   ${border}   ${pc.red(line)}`);
}

/**
 * Formats a memory size in bytes to a human-readable string (e.g. KiB, MiB).
 */
export function formatMemory(bytes: number | undefined): string {
  if (bytes === undefined || bytes === null || isNaN(bytes)) {
    return 'Unknown';
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  const kib = bytes / 1024;
  if (kib < 1024) {
    return `${kib.toFixed(1)} KiB`;
  }
  const mib = kib / 1024;
  return `${mib.toFixed(1)} MiB`;
}
