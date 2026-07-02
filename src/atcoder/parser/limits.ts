import { ParseError } from '../../utils/errors';

export function parseTimeLimit(text: string): number {
  // Support both English and Japanese formats
  const timeRegex = /(?:Time Limit|実行時間制限)\s*:\s*([\d.]+)\s*(sec|ms|秒|ミリ秒)/i;
  const match = text.match(timeRegex);
  
  if (!match) {
    // If not found with label, try parsing raw units in the context of limits
    const simpleRegex = /(\d+(?:\.\d+)?)\s*(sec|ms|秒|ミリ秒)/i;
    const simpleMatch = text.match(simpleRegex);
    if (!simpleMatch) {
      throw new ParseError(`Could not parse time limit from text: "${text}"`);
    }
    return convertTimeToMs(parseFloat(simpleMatch[1]), simpleMatch[2]);
  }

  const value = parseFloat(match[1]);
  const unit = match[2];
  return convertTimeToMs(value, unit);
}

function convertTimeToMs(value: number, unit: string): number {
  const normUnit = unit.toLowerCase();
  if (normUnit === 'sec' || normUnit === '秒') {
    return Math.round(value * 1000);
  }
  if (normUnit === 'ms' || normUnit === 'ミリ秒') {
    return Math.round(value);
  }
  throw new ParseError(`Unknown time unit: "${unit}"`);
}

/**
 * Parses a memory limit string and returns the limit in bytes.
 * E.g., "1024 MB", "1024 MiB", "256 KB", "256 KiB", "1 GB", "1 GiB"
 */
export function parseMemoryLimit(text: string): number {
  const memoryRegex = /(?:Memory Limit|メモリ制限)\s*:\s*(\d+)\s*(KB|MB|GB|KiB|MiB|GiB)/i;
  const match = text.match(memoryRegex);

  if (!match) {
    const simpleRegex = /(\d+)\s*(KB|MB|GB|KiB|MiB|GiB)/i;
    const simpleMatch = text.match(simpleRegex);
    if (!simpleMatch) {
      throw new ParseError(`Could not parse memory limit from text: "${text}"`);
    }
    return convertMemoryToBytes(parseInt(simpleMatch[1], 10), simpleMatch[2]);
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];
  return convertMemoryToBytes(value, unit);
}

function convertMemoryToBytes(value: number, unit: string): number {
  const normUnit = unit.toLowerCase();
  switch (normUnit) {
    case 'kb':
    case 'kib':
      return value * 1024;
    case 'mb':
    case 'mib':
      return value * 1024 * 1024;
    case 'gb':
    case 'gib':
      return value * 1024 * 1024 * 1024;
    default:
      throw new ParseError(`Unknown memory unit: "${unit}"`);
  }
}
