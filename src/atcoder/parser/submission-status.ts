import * as cheerio from 'cheerio';

export interface SubmissionStatus {
  status: string;
  time?: string;
  memory?: string;
  score?: string;
  isCompleted: boolean;
}

export function parseSubmissionStatus(html: string): SubmissionStatus {
  const $ = cheerio.load(html);
  
  let status = '';
  let time: string | undefined;
  let memory: string | undefined;
  let score: string | undefined;

  const statusElem = $('#judge-status');
  if (statusElem.length > 0) {
    status = statusElem.text().trim();
  } else {
    $('table tr').each((_, tr) => {
      const thText = $(tr).find('th').text().trim();
      if (thText === 'Status' || thText === '状態' || thText === '結果') {
        status = $(tr).find('td').text().trim();
      }
    });
  }

  $('table tr').each((_, tr) => {
    const thText = $(tr).find('th').text().trim();
    const tdText = $(tr).find('td').text().trim();

    if (thText === 'Execution Time' || thText === '実行時間') {
      time = tdText;
    } else if (thText === 'Memory' || thText === 'メモリ') {
      memory = tdText;
    } else if (thText === 'Score' || thText === '得点') {
      score = tdText;
    }
  });

  status = status.replace(/\s+/g, ' ');
  const isCompleted = status !== '' && !status.includes('WJ') && !status.includes('Judging');

  return {
    status: status || 'WJ',
    time,
    memory,
    score,
    isCompleted
  };
}
