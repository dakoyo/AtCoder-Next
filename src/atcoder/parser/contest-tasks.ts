import * as cheerio from 'cheerio';

export interface TaskInfo {
  id: string;
  label: string;
  url: string;
}

export function parseContestTasks(html: string): TaskInfo[] {
  const $ = cheerio.load(html);
  const tasks: TaskInfo[] = [];
  const seenIds = new Set<string>();

  $('a').each((_, elem) => {
    const href = $(elem).attr('href');
    if (href) {
      const match = href.match(/\/contests\/([^/]+)\/tasks\/([^/?#]+)$/);
      if (match) {
        const id = match[2];
        const label = $(elem).text().trim().toLowerCase();
        
        if (label.length > 0 && label.length <= 4 && !seenIds.has(id)) {
          seenIds.add(id);
          tasks.push({
            id,
            label,
            url: href
          });
        }
      }
    }
  });

  if (tasks.length === 0) {
    $('a').each((_, elem) => {
      const href = $(elem).attr('href');
      if (href) {
        const match = href.match(/\/contests\/([^/]+)\/tasks\/([^/?#]+)$/);
        if (match) {
          const id = match[2];
          const label = $(elem).text().trim().toLowerCase();
          if (label && !seenIds.has(id)) {
            seenIds.add(id);
            let cleanLabel = label;
            if (cleanLabel.length > 4) {
              const parts = id.split('_');
              cleanLabel = parts[parts.length - 1] || 'task';
            }
            tasks.push({
              id,
              label: cleanLabel.toLowerCase(),
              url: href
            });
          }
        }
      }
    });
  }

  return tasks.sort((a, b) => a.label.localeCompare(b.label));
}
