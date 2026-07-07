import * as p from '@clack/prompts';
import pc from 'picocolors';
import { getSystemLanguage, t } from '../utils/i18n';
import { initWorkspace, InitOptions } from '../workspace/initializer';

export async function handleInit() {
  const systemLang = getSystemLanguage();
  const defaultDisplayLang = systemLang === 'ja' ? 'ja' : 'en';

  const selectedDisplayLang = await p.select({
    message: defaultDisplayLang === 'ja' ? '表示言語を選択してください (Select display language):' : 'Select display language (表示言語を選択してください):',
    options: [
      { value: 'en', label: 'English' },
      { value: 'ja', label: '日本語' }
    ],
    initialValue: defaultDisplayLang
  }) as 'en' | 'ja';

  if (p.isCancel(selectedDisplayLang)) {
    p.cancel(t('initCancelled', defaultDisplayLang));
    process.exit(0);
  }

  p.intro(pc.cyan(t('initIntro', selectedDisplayLang)));

  const extractProblemStatement = await p.confirm({
    message: t('initSelectExtractProblem', selectedDisplayLang),
    initialValue: false
  });

  if (p.isCancel(extractProblemStatement)) {
    p.cancel(t('initCancelled', selectedDisplayLang));
    process.exit(0);
  }
  let problemLang: 'en' | 'ja' = selectedDisplayLang;
  if (extractProblemStatement) {
    problemLang = await p.select({
      message: t('initSelectProblemLang', selectedDisplayLang),
      options: [
        { value: 'ja', label: selectedDisplayLang === 'ja' ? '日本語' : 'Japanese' },
        { value: 'en', label: selectedDisplayLang === 'ja' ? '英語' : 'English' }
      ],
      initialValue: selectedDisplayLang
    }) as 'en' | 'ja';
  }

  if (p.isCancel(problemLang)) {
    p.cancel(t('initCancelled', selectedDisplayLang));
    process.exit(0);
  }

  const defaultLanguage = await p.select({
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

  if (p.isCancel(defaultLanguage)) {
    p.cancel(t('initCancelled', selectedDisplayLang));
    process.exit(0);
  }
  
  const targetDir = process.cwd();
  const s = p.spinner();
  s.start(t('initSpinner', selectedDisplayLang));
  
  const initOptions: InitOptions = {
    defaultLanguage: defaultLanguage as string,
    lang: selectedDisplayLang,
    extractProblemStatement: extractProblemStatement as boolean,
    problemLang: problemLang
  };

  const { alreadyInitialized, gitignoreUpdated } = initWorkspace(targetDir, initOptions);
  
  s.stop(t('initFilesSet', selectedDisplayLang));

  if (alreadyInitialized) {
    p.log.warn(t('initAlreadyInitialized', selectedDisplayLang));
  } else {
    p.log.success(t('initCreatedConfig', selectedDisplayLang, defaultLanguage));
  }

  if (gitignoreUpdated) {
    p.log.success(t('initGitignoreUpdated', selectedDisplayLang));
  }

  p.outro(pc.green(t('initOutro', selectedDisplayLang)));
}
