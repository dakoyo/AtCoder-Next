import * as cheerio from 'cheerio';
import { parseTimeLimit, parseMemoryLimit } from './limits';
import { ParseError } from '../../utils/errors';

export interface SampleCase {
  index: number;
  input: string;
  output: string;
}

export interface ContestDuration {
  start: Date;
  end: Date;
}

export interface TaskDetails {
  title: string;
  timeLimitMs: number;
  memoryLimitBytes: number;
  samples: SampleCase[];
  problemStatementMd?: string;
  contestDuration?: ContestDuration | null;
}

function escapeMarkdown(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\*/g, '\\*')
    .replace(/_/g, '\\_')
    .replace(/`/g, '\\`')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]');
}

function convertLineToMath(line: string): string {
  const trimmed = line.trim();
  if (trimmed === ':' || trimmed === '\\vdots') {
    return '\\vdots';
  }
  if (trimmed === '...' || trimmed === '\\dots' || trimmed === '\\cdots') {
    return '\\dots';
  }

  let result = '';
  let i = 0;

  while (i < line.length) {
    const remaining = line.slice(i);


    if (remaining.startsWith(' ')) {
      result += '\\ ';
      i += 1;
      continue;
    }

    const cmdMatch = remaining.match(/^(\\[a-zA-Z]+)/);
    if (cmdMatch) {
      const cmd = cmdMatch[1];
      if (cmd === '\\ldots' || cmd === '\\dots' || cmd === '\\cdots') {
        result += '\\ldots';
      } else if (cmd === '\\vdots') {
        result += '\\vdots';
      } else {
        result += cmd;
      }
      i += cmd.length;
      continue;
    }

    if (remaining.startsWith('...')) {
      result += '\\ldots';
      i += 3;
      continue;
    }

    if (remaining.startsWith(':')) {
      result += '\\vdots';
      i += 1;
      continue;
    }

    const textMatch = remaining.match(/^\\text\{([^{}]+)\}/);
    if (textMatch) {
      result += textMatch[0];
      i += textMatch[0].length;
      continue;
    }

    if (/^([_{}(),:;=+*\-\/])/.test(remaining)) {
      result += remaining[0];
      i += 1;
      continue;
    }

    const charMatch = remaining.match(/^([a-zA-Z0-9])/);
    if (charMatch) {
      const char = charMatch[1];
      if (/^[a-zA-Z]$/.test(char)) {
        result += char;
      } else {
        result += char;
      }
      i += 1;
      continue;
    }

    result += line[i];
    i += 1;
  }

  return result;
}

function renderPreAsMathArray(node: any, $: cheerio.CheerioAPI): string {
  const rawText = $(node).text();
  const lines = rawText.split('\n');
  
  let startIdx = 0;
  while (startIdx < lines.length && lines[startIdx].trim() === '') {
    startIdx++;
  }
  let endIdx = lines.length - 1;
  while (endIdx >= startIdx && lines[endIdx].trim() === '') {
    endIdx--;
  }
  
  const activeLines = lines.slice(startIdx, endIdx + 1);
  if (activeLines.length === 0) {
    return '';
  }
  
  const convertedLines = activeLines.map(line => convertLineToMath(line));
  
  let result = '\n\n$$\n\\begin{array}{l}\n';
  result += convertedLines.join(' \\\\\n');
  result += '\n\\end{array}\n$$\n\n';
  
  return result;
}

function processTextNode(text: string): string {
  const parts: string[] = [];
  let i = 0;
  while (i < text.length) {
    if (text.startsWith('\\[', i)) {
      const start = i;
      const end = text.indexOf('\\]', i + 2);
      if (end !== -1) {
        const mathContent = text.slice(start + 2, end);
        parts.push(`$$\n${mathContent.trim()}\n$$`);
        i = end + 2;
      } else {
        parts.push(escapeMarkdown(text.slice(i, i + 2)));
        i += 2;
      }
    } else if (text.startsWith('\\(', i)) {
      const start = i;
      const end = text.indexOf('\\)', i + 2);
      if (end !== -1) {
        const mathContent = text.slice(start + 2, end);
        parts.push(`$${mathContent.trim()}$`);
        i = end + 2;
      } else {
        parts.push(escapeMarkdown(text.slice(i, i + 2)));
        i += 2;
      }
    } else if (text.startsWith('$$', i)) {
      const start = i;
      const end = text.indexOf('$$', i + 2);
      if (end !== -1) {
        const mathContent = text.slice(start + 2, end);
        parts.push(`$$\n${mathContent.trim()}\n$$`);
        i = end + 2;
      } else {
        parts.push(escapeMarkdown(text.slice(i, i + 2)));
        i += 2;
      }
    } else if (text.startsWith('$', i)) {
      const start = i;
      const end = text.indexOf('$', i + 1);
      if (end !== -1) {
        const mathContent = text.slice(start + 1, end);
        parts.push(`$${mathContent.trim()}$`);
        i = end + 1;
      } else {
        parts.push('$');
        i += 1;
      }
    } else {
      let nextIndex = -1;
      let selectedDelim = '';
      
      const delims = ['\\[', '\\(', '$$', '$'];
      for (const delim of delims) {
        const idx = text.indexOf(delim, i);
        if (idx !== -1 && (nextIndex === -1 || idx < nextIndex)) {
          nextIndex = idx;
          selectedDelim = delim;
        }
      }
      
      if (nextIndex === -1) {
        parts.push(escapeMarkdown(text.slice(i)));
        break;
      } else {
        parts.push(escapeMarkdown(text.slice(i, nextIndex)));
        i = nextIndex;
      }
    }
  }
  return parts.join('');
}

function nodeToMarkdown(node: any, $: cheerio.CheerioAPI, isInsideMath = false): string {
  if (node.type === 'text') {
    return isInsideMath ? ((node as any).data || '') : processTextNode((node as any).data || '');
  }

  if (node.type === 'tag') {
    const tagName = (node as any).name;
    const className = $(node).attr('class') || '';
    const classes = className.split(/\s+/);
    const isMathContainer = tagName === 'var' || classes.includes('math');
    const isBlockMath = tagName === 'div' && classes.includes('math');

    if (isMathContainer) {
      let mathBody = '';
      if ((node as any).children) {
        for (const child of (node as any).children) {
          mathBody += nodeToMarkdown(child, $, true);
        }
      }
      const delim = isBlockMath ? '$$' : '$';
      if (isBlockMath) {
        return `\n\n$$\n${mathBody.trim()}\n$$\n\n`;
      }
      return `${delim}${mathBody.trim()}${delim}`;
    }

    if (tagName === 'table') {
      const $table = $(node).clone();
      $table.find('a').each((_, el) => {
        const href = $(el).attr('href');
        if (href && href.startsWith('/') && !href.startsWith('//')) {
          $(el).attr('href', 'https://atcoder.jp' + href);
        }
      });
      $table.find('img').each((_, el) => {
        const src = $(el).attr('src');
        if (src && src.startsWith('/') && !src.startsWith('//')) {
          $(el).attr('src', 'https://atcoder.jp' + src);
        }
      });
      return '\n\n' + $.html($table) + '\n\n';
    }

    let childrenMarkdown = '';
    if ((node as any).children) {
      for (const child of (node as any).children) {
        childrenMarkdown += nodeToMarkdown(child, $, isInsideMath);
      }
    }

    switch (tagName) {
      case 'h1':
      case 'h2':
      case 'h3':
      case 'h4':
      case 'h5':
      case 'h6': {
        const level = parseInt(tagName.substring(1), 10);
        return `\n\n${'#'.repeat(level)} ${childrenMarkdown.trim()}\n\n`;
      }
      case 'p':
        return `\n\n${childrenMarkdown.trim()}\n\n`;
      case 'br':
        return '\n';
      case 'strong':
      case 'b':
        return `**${childrenMarkdown.trim()}**`;
      case 'em':
      case 'i':
        return `*${childrenMarkdown.trim()}*`;
      case 'code': {
        const parentTagName = (node.parent as any)?.name;
        if (parentTagName === 'pre') {
          return childrenMarkdown;
        }
        return `\`${childrenMarkdown}\``;
      }
      case 'pre': {
        const text = $(node).text();
        const hasVar = $(node).find('var').length > 0;
        const hasMathSymbols = text.includes('\\dots') || text.includes('\\vdots') || text.includes('\\cdots') || text.includes('\\le');
        if (hasVar || hasMathSymbols) {
          return renderPreAsMathArray(node, $);
        }
        return `\n\n\`\`\`\n${text.trim()}\n\`\`\`\n\n`;
      }
      case 'a': {
        let href = $(node).attr('href') || '';
        if (href.startsWith('/') && !href.startsWith('//')) {
          href = 'https://atcoder.jp' + href;
        }
        return `[${childrenMarkdown.trim()}](${href})`;
      }
      case 'img': {
        let src = $(node).attr('src') || '';
        if (src.startsWith('/') && !src.startsWith('//')) {
          src = 'https://atcoder.jp' + src;
        }
        const alt = $(node).attr('alt') || '';
        return `![${alt}](${src})`;
      }
      case 'ul':
      case 'ol':
        return `\n\n${childrenMarkdown}\n\n`;
      case 'li': {
        let indentLevel = 0;
        let parent = node.parent;
        while (parent) {
          const parentName = (parent as any).name;
          if (parentName === 'ul' || parentName === 'ol') {
            indentLevel++;
          }
          parent = parent.parent;
        }
        const indent = '  '.repeat(Math.max(0, indentLevel - 1));
        const parentTagName = (node.parent as any)?.name;
        const prefix = parentTagName === 'ol' ? '1. ' : '- ';
        return `\n${indent}${prefix}${childrenMarkdown.trim()}`;
      }
      case 'div':
      case 'span':
      case 'section':
        return childrenMarkdown;
      default:
        return childrenMarkdown;
    }
  }

  return '';
}

export function parseProblemPage(html: string, preferredLang?: 'en' | 'ja'): TaskDetails {
  const $ = cheerio.load(html);

  // Parse contest duration
  let contestDuration: ContestDuration | null = null;
  const durationElement = $('.contest-duration');
  if (durationElement.length > 0) {
    const links = durationElement.find('a');
    if (links.length >= 2) {
      const startHref = $(links[0]).attr('href');
      const endHref = $(links[1]).attr('href');
      if (startHref && endHref) {
        const startIso = parseIsoFromTimeAndDateUrl(startHref);
        const endIso = parseIsoFromTimeAndDateUrl(endHref);
        if (startIso && endIso) {
          contestDuration = {
            start: parseIsoToDate(startIso),
            end: parseIsoToDate(endIso)
          };
        }
      }
    }
  }

  const now = new Date();
  const isContestActive = contestDuration && now >= contestDuration.start && now <= contestDuration.end;

  let title = $('span.h2').first().text().trim();
  if (!title) {
    title = $('h2').first().text().trim();
  }
  if (!title) {
    title = $('title').text().trim() || 'Task';
  }

  title = title.replace(/\s+/g, ' ');

  const taskStatementText = $('#task-statement').text() || $('body').text();
  let timeLimitMs = 2000;
  let memoryLimitBytes = 1024 * 1024 * 1024;

  try {
    timeLimitMs = parseTimeLimit(taskStatementText);
  } catch (e) {
    try {
      timeLimitMs = parseTimeLimit($('body').text());
    } catch (err) {
      console.warn('Could not parse time limit. Using default 2000ms.');
    }
  }

  try {
    memoryLimitBytes = parseMemoryLimit(taskStatementText);
  } catch (e) {
    try {
      memoryLimitBytes = parseMemoryLimit($('body').text());
    } catch (err) {
      console.warn('Could not parse memory limit. Using default 1024MB.');
    }
  }

  let $container = $('#task-statement');
  if (preferredLang === 'ja') {
    if ($container.find('.lang-ja').length > 0) {
      $container = $container.find('.lang-ja');
    } else if ($container.find('.lang-en').length > 0) {
      $container = $container.find('.lang-en');
    }
  } else {
    if ($container.find('.lang-en').length > 0) {
      $container = $container.find('.lang-en');
    } else if ($container.find('.lang-ja').length > 0) {
      $container = $container.find('.lang-ja');
    }
  }

  // Convert task statement HTML to Markdown if task statement exists
  let problemStatementMd: string | undefined = undefined;
  if ($container.length > 0 && !isContestActive) {
    let mdBody = '';
    $container.contents().each((_, node) => {
      mdBody += nodeToMarkdown(node, $);
    });
    mdBody = mdBody.replace(/\n{3,}/g, '\n\n').trim();

    problemStatementMd = `# ${title}\n\n`;
    problemStatementMd += `- Time Limit: ${timeLimitMs / 1000} sec\n`;
    problemStatementMd += `- Memory Limit: ${Math.round(memoryLimitBytes / (1024 * 1024))} MB\n\n`;
    problemStatementMd += mdBody + '\n';
  }

  const sampleMap: Record<number, { input?: string; output?: string }> = {};

  const inputRegex = /(?:Sample\s+Input|入力例)\s*(?:#|No\.?)?\s*(\d+)/i;
  const outputRegex = /(?:Sample\s+Output|出力例)\s*(?:#|No\.?)?\s*(\d+)/i;

  $container.find('h3, h4').each((_, elem) => {
    const headerText = $(elem).text().trim();
    
    const inputMatch = headerText.match(inputRegex);
    const outputMatch = headerText.match(outputRegex);

    if (inputMatch || outputMatch) {
      const isInput = !!inputMatch;
      const index = parseInt(isInput ? inputMatch![1] : outputMatch![1], 10);

      let $pre = $(elem).next('pre');
      if ($pre.length === 0) {
        $pre = $(elem).parent().find('pre');
      }
      if ($pre.length === 0 || $pre.parent().is(elem)) {
        $pre = $(elem).nextAll('pre').first();
      }
      if ($pre.length === 0) {
        $pre = $(elem).nextAll().find('pre').first();
      }

      if ($pre.length > 0) {
        let content = $pre.text();
        content = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        if (content && !content.endsWith('\n')) {
          content += '\n';
        }

        if (!sampleMap[index]) {
          sampleMap[index] = {};
        }

        if (isInput) {
          sampleMap[index].input = content;
        } else {
          sampleMap[index].output = content;
        }
      }
    }
  });

  const samples: SampleCase[] = Object.keys(sampleMap)
    .map(key => {
      const idx = parseInt(key, 10);
      return {
        index: idx,
        input: sampleMap[idx].input ?? '',
        output: sampleMap[idx].output ?? ''
      };
    })
    .filter(s => s.input !== '' || s.output !== '')
    .sort((a, b) => a.index - b.index);

  return {
    title,
    timeLimitMs,
    memoryLimitBytes,
    samples,
    problemStatementMd,
    contestDuration
  };
}

function parseIsoFromTimeAndDateUrl(url: string): string | null {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.searchParams.get('iso');
  } catch (e) {
    const match = url.match(/[?&]iso=([^&]+)/);
    return match ? match[1] : null;
  }
}

function parseIsoToDate(iso: string): Date {
  const match = iso.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})$/);
  if (!match) {
    return new Date(iso);
  }
  const [_, y, m, d, hh, mm] = match;
  return new Date(`${y}-${m}-${d}T${hh}:${mm}:00+09:00`);
}
