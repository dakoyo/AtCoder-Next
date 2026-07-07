import * as fs from 'fs';
import * as path from 'path';
import * as cheerio from 'cheerio';
import { createAtCoderClient } from './client';
import { loadConfig } from '../config';
import { detectCodeFile, resolvePlaceholder } from '../test-runner/runner';
import { AtcError } from '../utils/errors';
import { getLocale, t } from '../utils/i18n';

export interface SubmissionDetails {
  submissionId: string;
  url: string;
}

/**
 * Submits the code file for a task to AtCoder.
 * Returns the submission ID and submission URL.
 */
export async function submitTask(
  workspaceRoot: string,
  contestId: string,
  taskId: string,
  taskLabel: string,
  fileArg?: string
): Promise<SubmissionDetails> {
  const config = loadConfig(workspaceRoot);
  const locale = getLocale(workspaceRoot);
  const contestParentDir = config.contestDir ? path.join(workspaceRoot, config.contestDir) : workspaceRoot;
  const taskDir = path.join(contestParentDir, contestId, taskLabel);

  if (!fs.existsSync(taskDir)) {
    throw new AtcError(`Task directory "${taskLabel}" not found in contest "${contestId}".`);
  }

  const { codeFile, langConfig } = detectCodeFile(workspaceRoot, taskDir, config, fileArg);

  if (!langConfig.submitFile || langConfig.submitFile.trim() === '') {
    throw new AtcError(`No 'submitFile' specified in your language configuration. Setting 'submitFile' is required for submission.`);
  }

  let submitFileName = resolvePlaceholder(langConfig.submitFile, codeFile);
  const candidatePath = path.join(taskDir, submitFileName);
  if (!fs.existsSync(candidatePath)) {
    throw new AtcError(`Submit file "${submitFileName}" specified in language configuration was not found. Did the build command fail?`);
  }

  const codePath = path.join(taskDir, submitFileName);
  const codeContent = fs.readFileSync(codePath, 'utf8');

  const client = createAtCoderClient(workspaceRoot);

  let submitPageHtml = '';
  try {
    const res = await client.get(`/contests/${contestId}/submit?taskScreenName=${taskId}`);
    submitPageHtml = res.data;
  } catch (err: any) {
    const html = err.response?.data;
    if (html && (html.includes('cf-challenge') || html.includes('challenges.cloudflare.com') || html.includes('Turnstile') || html.includes('cf-turnstile'))) {
      throw new AtcError(t('submitTurnstileDetected', locale));
    }
    if (err.response?.status === 403) {
      throw new AtcError(t('submitTurnstileDetected', locale));
    }
    throw new AtcError(`Failed to access AtCoder submit page: ${err.message}`);
  }

  const $ = cheerio.load(submitPageHtml);
  
  const csrfToken = $('input[name="csrf_token"]').val();
  if (!csrfToken) {
    throw new AtcError('Could not find CSRF token. Make sure you are logged in (run "atc login").');
  }

  let selectElement = $(`#select-lang-${taskId} select`);
  if (selectElement.length === 0) {
    selectElement = $('div#select-lang select');
  }
  if (selectElement.length === 0) {
    selectElement = $('select[name="data.LanguageId"]');
  }

  if (selectElement.length === 0) {
    if ($('input[name="username"]').length > 0 || $('input[name="password"]').length > 0 || submitPageHtml.includes('/login')) {
      throw new AtcError(t('submitSessionExpired', locale));
    }
    throw new AtcError(t('submitLangSelectNotFound', locale));
  }

  const options: { id: string; name: string }[] = [];
  selectElement.find('option').each((_, opt) => {
    const id = $(opt).val();
    const name = $(opt).text().trim();
    if (id && name) {
      options.push({ id: id.toString(), name });
    }
  });

  let selectedLangId = '';
  
  if (langConfig.atcoderLanguage && langConfig.atcoderLanguage.trim() !== '') {
    const target = langConfig.atcoderLanguage.toLowerCase().trim();
    const matched = options.find(opt => opt.name.toLowerCase() === target) ||
                    options.find(opt => opt.name.toLowerCase().includes(target));
    if (matched) {
      selectedLangId = matched.id;
    }
  }

  if (!selectedLangId && langConfig.atcoderLanguageIdRegex && langConfig.atcoderLanguageIdRegex.trim() !== '') {
    const userRegex = new RegExp(langConfig.atcoderLanguageIdRegex.trim(), 'i');
    const matched = options.find(opt => userRegex.test(opt.name));
    if (matched) {
      selectedLangId = matched.id;
    }
  }

  if (!selectedLangId) {
    if (langConfig.extension === 'cpp') {
      const matched = options.find(opt => /C\+\+/i.test(opt.name) && !/Clang/i.test(opt.name)) || 
                      options.find(opt => /C\+\+/i.test(opt.name));
      if (matched) selectedLangId = matched.id;
    } else if (langConfig.extension === 'py') {
      const matched = options.find(opt => /PyPy3/i.test(opt.name)) || 
                      options.find(opt => /Python3/i.test(opt.name)) || 
                      options.find(opt => /Python/i.test(opt.name));
      if (matched) selectedLangId = matched.id;
    } else if (langConfig.extension === 'rs') {
      const matched = options.find(opt => /Rust/i.test(opt.name));
      if (matched) selectedLangId = matched.id;
    } else if (langConfig.extension === 'ts') {
      const matched = options.find(opt => /TypeScript/i.test(opt.name));
      if (matched) selectedLangId = matched.id;
    } else if (langConfig.extension === 'js') {
      const matched = options.find(opt => /JavaScript/i.test(opt.name));
      if (matched) selectedLangId = matched.id;
    } else if (langConfig.extension === 'c') {
      const matched = options.find(opt => /^C\s*(\(|$)/i.test(opt.name)) || 
                      options.find(opt => /^C\s*(GCC|Clang)/i.test(opt.name)) ||
                      options.find(opt => /^C\b/i.test(opt.name) && !/C\+\+/i.test(opt.name) && !/C#/i.test(opt.name) && !/Objective-C/i.test(opt.name));
      if (matched) selectedLangId = matched.id;
    }
  }

  if (!selectedLangId) {
    const extRegex = new RegExp(langConfig.extension, 'i');
    const matched = options.find(opt => extRegex.test(opt.name));
    if (matched) {
      selectedLangId = matched.id;
    } else if (options.length > 0) {
      selectedLangId = options[0].id;
    } else {
      throw new AtcError('No language options available on AtCoder submit page.');
    }
  }

  const postData = new URLSearchParams();
  postData.append('csrf_token', csrfToken.toString());
  postData.append('data.TaskScreenName', taskId);
  postData.append('data.LanguageId', selectedLangId);
  postData.append('sourceCode', codeContent);

  try {
    const postRes = await client.post(`/contests/${contestId}/submit`, postData.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': `https://atcoder.jp/contests/${contestId}/submit?taskScreenName=${taskId}`
      },
      maxRedirects: 0,
      validateStatus: (status) => status >= 200 && status < 400
    });

    if (postRes.status !== 302) {
      const $post = cheerio.load(postRes.data);
      
      const hasTurnstile = $post('.cf-challenge').length > 0 || 
                           postRes.data.includes('cf-challenge') || 
                           postRes.data.includes('challenges.cloudflare.com') || 
                           postRes.data.includes('Turnstile') || 
                           postRes.data.includes('cf-turnstile');
      if (hasTurnstile) {
        throw new AtcError(t('submitTurnstileDetected', locale));
      }

      let alertText = $post('.alert-danger, .alert-warning').text().trim();
      if (!alertText) {
        throw new AtcError(t('submitRejected', locale));
      }
      alertText = alertText.replace(/^×\s*/, '').trim();
      
      // If the alert text is simply "Error.", it might be a Cloudflare block page
      if (alertText.toLowerCase() === 'error' || alertText.toLowerCase() === 'error.') {
        throw new AtcError(t('submitTurnstileDetected', locale));
      }
      throw new AtcError(alertText);
    }

    const meRes = await client.get(`/contests/${contestId}/submissions/me`);
    const $me = cheerio.load(meRes.data);

    let submissionId = '';
    $me('table tbody tr').first().find('a').each((_, a) => {
      const href = $me(a).attr('href');
      if (href) {
        const match = href.match(/\/contests\/[^/]+\/submissions\/(\d+)/);
        if (match && match[1]) {
          submissionId = match[1];
        }
      }
    });

    if (!submissionId) {
      throw new AtcError('Submission succeeded but could not retrieve the submission ID.');
    }

    return {
      submissionId,
      url: `/contests/${contestId}/submissions/${submissionId}`
    };
  } catch (err: any) {
    if (err instanceof AtcError) {
      throw err;
    }
    const html = err.response?.data;
    if (html && (html.includes('cf-challenge') || html.includes('challenges.cloudflare.com') || html.includes('Turnstile') || html.includes('cf-turnstile'))) {
      throw new AtcError(t('submitTurnstileDetected', locale));
    }
    if (err.response?.status === 403) {
      throw new AtcError(t('submitTurnstileDetected', locale));
    }
    throw new AtcError(`Failed to submit code: ${err.message}`);
  }
}
