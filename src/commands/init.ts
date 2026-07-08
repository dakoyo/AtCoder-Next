import * as p from '@clack/prompts';
import pc from 'picocolors';
import { getSystemLocale, t, Locale } from '../utils/i18n';
import { initWorkspace, InitOptions } from '../workspace/initializer';
import * as fs from 'fs';
import * as path from 'path';

export async function handleInit(dirArg?: string, options?: any) {
  const systemLang: Locale = getSystemLocale();
  const defaultDisplayLang: Locale = systemLang === 'ja' ? 'ja' : 'en';

  const isNonInteractive = !process.stdout.isTTY || (options && options.yes) || (process.env.ATC_NON_INTERACTIVE === 'true') || (process.env.ATC_YES === 'true');

  let selectedDisplayLang: Locale = defaultDisplayLang;
  let extractProblemStatement = false;
  let problemLang: Locale = defaultDisplayLang;
  let defaultLanguage = 'cpp';

  if (isNonInteractive) {
    selectedDisplayLang = defaultDisplayLang;
    extractProblemStatement = false;
    problemLang = defaultDisplayLang;
    defaultLanguage = 'cpp';
  } else {
    const selected = await p.select({
      message: defaultDisplayLang === 'ja' ? '表示言語を選択してください (Select display language):' : 'Select display language (表示言語を選択してください):',
      options: [
        { value: 'en', label: 'English' },
        { value: 'ja', label: '日本語' }
      ],
      initialValue: defaultDisplayLang
    });

    if (p.isCancel(selected)) {
      p.cancel(t('initCancelled', defaultDisplayLang));
      process.exit(0);
    }
    selectedDisplayLang = selected as 'en' | 'ja';

    p.intro(pc.cyan(t('initIntro', selectedDisplayLang)));

    const extract = await p.confirm({
      message: t('initSelectExtractProblem', selectedDisplayLang),
      initialValue: false
    });

    if (p.isCancel(extract)) {
      p.cancel(t('initCancelled', selectedDisplayLang));
      process.exit(0);
    }
    extractProblemStatement = extract as boolean;

    if (extractProblemStatement) {
      const probLang = await p.select({
        message: t('initSelectProblemLang', selectedDisplayLang),
        options: [
          { value: 'ja', label: selectedDisplayLang === 'ja' ? '日本語' : 'Japanese' },
          { value: 'en', label: selectedDisplayLang === 'ja' ? '英語' : 'English' }
        ],
        initialValue: selectedDisplayLang
      });

      if (p.isCancel(probLang)) {
        p.cancel(t('initCancelled', selectedDisplayLang));
        process.exit(0);
      }
      problemLang = probLang as 'en' | 'ja';
    }

    const defLang = await p.select({
      message: t('initSelectLang', selectedDisplayLang),
      options: [
        { value: 'cpp', label: 'C++ (cpp)' },
        { value: 'python', label: 'Python (python)' },
        { value: 'rust', label: 'Rust (rust)' },
        { value: 'typescript', label: 'TypeScript (typescript)' },
        { value: 'javascript', label: 'JavaScript (javascript)' },
        { value: 'c', label: 'C (c)' }
      ]
    });

    if (p.isCancel(defLang)) {
      p.cancel(t('initCancelled', selectedDisplayLang));
      process.exit(0);
    }
    defaultLanguage = defLang as string;
  }

  const targetDir = dirArg ? path.resolve(dirArg) : process.cwd();
  
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const s = p.spinner();
  s.start(t('initSpinner', selectedDisplayLang));
  
  const initOptions: InitOptions = {
    defaultLanguage,
    lang: selectedDisplayLang,
    extractProblemStatement,
    problemLang
  };

  const { alreadyInitialized, gitignoreUpdated } = initWorkspace(targetDir, initOptions);
  
  s.stop(t('initFilesSet', selectedDisplayLang));

  if (alreadyInitialized) {
    p.log.warn(t('initAlreadyInitialized', selectedDisplayLang));
  } else {
    p.log.success(t('initCreatedConfig', selectedDisplayLang, defaultLanguage));
  }

  p.outro(pc.green(t('initOutro', selectedDisplayLang)));
}
