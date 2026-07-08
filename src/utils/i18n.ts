import pc from 'picocolors';
import { loadConfig } from '../config';
import { findWorkspaceRoot } from '../workspace/finder';

export type Locale = 'en' | 'ja';

/**
 * Detects the system locale.
 * Default is English. If Japanese is detected in environment variables, returns 'ja'.
 */
export function getSystemLocale(): Locale {
  const envs = [
    process.env.LANG,
    process.env.LANGUAGE,
    process.env.LC_ALL,
    process.env.LC_MESSAGES
  ];
  for (const env of envs) {
    if (env && env.toLowerCase().includes('ja')) {
      return 'ja';
    }
  }
  return 'en';
}

/**
 * Gets the current active locale.
 * Looks up the workspace config first, then falls back to system locale.
 */
export function getLocale(workspaceRoot?: string): Locale {
  if (process.env.ATC_LOCALE === 'en' || process.env.ATC_LOCALE === 'ja') {
    return process.env.ATC_LOCALE;
  }
  let root = workspaceRoot;
  if (!root) {
    try {
      root = findWorkspaceRoot();
    } catch {
      // Not in workspace
    }
  }

  if (root) {
    try {
      const config = loadConfig(root);
      if (config.lang === 'ja' || config.lang === 'en') {
        return config.lang;
      }
    } catch {
      // Ignore config loading errors
    }
  }

  return getSystemLocale();
}

// Translations dictionary
export const MESSAGES = {
  // Common / Errors
  workspaceNotFound: {
    en: '.atcoder-next/ directory was not found. Please run "atc init" in your workspace root first.',
    ja: '.atcoder-next/ ディレクトリが見つかりませんでした。先にワークスペースのルートで "atc init" を実行してください。'
  },
  
  // CLI Command Descriptions
  descInit: {
    en: 'Initialize .atcoder-next/ workspace and configure .gitignore',
    ja: 'AtCoder Next ワークスペース (.atcoder-next/) を初期化し、.gitignore を設定します'
  },
  descLogin: {
    en: 'Log in to AtCoder',
    ja: 'AtCoder にログインします'
  },
  descLogout: {
    en: 'Discard the local session Cookie',
    ja: 'ローカルに保存されているセッションクッキーを破棄してログアウトします'
  },
  descWhoami: {
    en: 'Verify and display current login status',
    ja: '現在のログイン状態を確認・表示します'
  },
  descNew: {
    en: 'Create task directories and download sample cases',
    ja: '問題用フォルダを作成し、サンプルテストケースをダウンロードします'
  },
  descTest: {
    en: 'Run local tests against downloaded sample cases',
    ja: 'ダウンロードしたサンプルケースに対してローカルテストを実行します'
  },
  descPlay: {
    en: 'Build and run solution interactively with standard input',
    ja: 'ソリューションをビルド・実行し、標準入力をインタラクティブに入力します'
  },
  descOpen: {
    en: 'Open the problem page in your default web browser',
    ja: 'デフォルトのウェブブラウザで問題ページを開きます'
  },
  descSubmit: {
    en: 'Submit code to AtCoder',
    ja: 'コードを AtCoder に提出します'
  },
  descLang: {
    en: 'Change the display language (en or ja)',
    ja: '表示言語の切り替え (en または ja)'
  },
  descAddLang: {
    en: 'Add a programming language configuration and template',
    ja: 'プログラミング言語の設定とテンプレートを追加します'
  },
  descDefaultLang: {
    en: 'Change the default programming language for the workspace',
    ja: 'ワークスペースのデフォルトプログラミング言語を変更します'
  },
  descTools: {
    en: 'Utilities and tools for competitive programming',
    ja: '競技プログラミング用のユーティリティツール'
  },
  descBundle: {
    en: 'Bundle multiple source files into a single file with include expansions',
    ja: 'インクルード文を展開して、複数のソースファイルを1つのファイルにまとめます'
  },
  bundleSuccess: {
    en: (output: string) => `Successfully bundled files into ${output}`,
    ja: (output: string) => `ファイルを ${output} に正常にまとめました`
  },

  // init
  initIntro: {
    en: 'AtCoder Next - Workspace Initialization',
    ja: 'AtCoder Next - ワークスペース初期化'
  },
  initSelectDisplayLang: {
    en: 'Select display language:',
    ja: '表示言語を選択してください:'
  },
  initSelectExtractProblem: {
    en: 'Extract problem statements automatically?',
    ja: '問題文を自動で抽出（problem.mdの作成）しますか？'
  },
  initSelectProblemLang: {
    en: 'Select language for problem statements:',
    ja: '抽出する問題文の言語を選択してください:'
  },
  initSelectLang: {
    en: 'Select your default programming language:',
    ja: 'デフォルトのプログラミング言語を選択してください:'
  },
  initCancelled: {
    en: 'Initialization cancelled.',
    ja: '初期化がキャンセルされました。'
  },
  initSpinner: {
    en: 'Initializing workspace...',
    ja: 'ワークスペースを初期化中...'
  },
  initFilesSet: {
    en: 'Workspace files set up.',
    ja: 'ワークスペースファイルがセットアップされました。'
  },
  initAlreadyInitialized: {
    en: '.atcoder-next/ directory already exists. Preserved existing configurations.',
    ja: '.atcoder-next/ ディレクトリは既に存在します。既存の設定は保持されました。'
  },
  initCreatedConfig: {
    en: (lang: string) => `Created .atcoder-next/ configuration (default language: ${lang}) and template folders.`,
    ja: (lang: string) => `.atcoder-next/ 設定ファイル（デフォルト言語: ${lang}）とテンプレートフォルダを作成しました。`
  },
  initGitignoreUpdated: {
    en: 'Added .atcoder-next/session.json to .gitignore to keep your credentials safe.',
    ja: '認証情報を安全に保つため、.atcoder-next/session.json を .gitignore に追加しました。'
  },
  initOutro: {
    en: 'Initialization complete! You can now run "atc login".',
    ja: '初期化が完了しました！ "atc login" を実行できます。'
  },
  initOutroNoLogin: {
    en: 'Initialization complete! You can now run "atc new <contest_id eg. abc123>" to set up a contest.',
    ja: '初期化が完了しました！ "atc new <contest_id 例: abc123>" を実行してコンテストをセットアップできます。'
  },

  // login
  loginIntro: {
    en: 'AtCoder Next - Login',
    ja: 'AtCoder Next - ログイン'
  },
  loginNote: {
    en: `Please copy your REVEL_SESSION cookie from your browser and paste it here.\n` +
        `To find it: Open developer tools (F12) on atcoder.jp -> Application / Storage -> Cookies -> REVEL_SESSION`,
    ja: `ブラウザから REVEL_SESSION クッキーをコピーして、ここに貼り付けてください。\n` +
        `確認方法: atcoder.jp で開発者ツール (F12) を開く -> アプリケーション/ストレージ -> クッキー -> REVEL_SESSION`
  },
  loginWelcome: {
    en: (username: string) => `Welcome, ${pc.bold(username)}! Session successfully validated and saved.`,
    ja: (username: string) => `ようこそ、${pc.bold(username)}さん！セッションが正常に検証され、保存されました。`
  },
  loginEnterCookie: {
    en: 'Enter your AtCoder REVEL_SESSION cookie value:',
    ja: 'AtCoder の REVEL_SESSION クッキーの値を入力してください:'
  },
  loginPlaceholder: {
    en: 'REVEL_SESSION=...',
    ja: 'REVEL_SESSION=...'
  },
  loginCookieNotEmpty: {
    en: 'Cookie value cannot be empty.',
    ja: 'クッキーの値を空にすることはできません。'
  },
  loginCancelled: {
    en: 'Login cancelled.',
    ja: 'ログインがキャンセルされました。'
  },
  loginVerifying: {
    en: 'Verifying REVEL_SESSION cookie...',
    ja: 'REVEL_SESSION クッキーを検証中...'
  },
  loginVerifySuccess: {
    en: 'Cookie verified successfully!',
    ja: 'クッキーの検証に成功しました！'
  },
  loginVerifyFailed: {
    en: 'Verification failed.',
    ja: '検証に失敗しました。'
  },
  loginRetryConfirm: {
    en: 'Would you like to try entering the cookie again?',
    ja: 'クッキーをもう一度入力しますか？'
  },
  loginAborted: {
    en: 'Login aborted.',
    ja: 'ログインが中断されました。'
  },
  loginMethodSelect: {
    en: 'Choose login method:',
    ja: 'ログイン方法を選択してください:'
  },
  loginMethodBrowserAuto: {
    en: 'Browser (Recommended)',
    ja: 'ブラウザ (推奨)'
  },
  loginMethodCookie: {
    en: 'Manually enter Cookie',
    ja: 'クッキーを手動入力'
  },
  loginNoBrowserDetected: {
    en: 'No chromium-based browsers were automatically detected.',
    ja: 'Chromium系のブラウザが自動検出されませんでした。'
  },
  loginSelectBrowser: {
    en: 'Select a browser to launch:',
    ja: '起動するブラウザを選択してください:'
  },
  loginLaunchingBrowser: {
    en: (port: number) => `Launching browser and waiting for remote debugging connection on port ${port}...`,
    ja: (port: number) => `ブラウザを起動し、ポート ${port} でリモートデバッグの接続を待機中...`
  },
  loginWaitingInBrowser: {
    en: 'Please log in to AtCoder in the opened browser window. We will automatically detect when you are logged in.',
    ja: '開いたブラウザで AtCoder にログインしてください。ログイン完了が自動的に検出されます。'
  },
  loginConnectionFailed: {
    en: 'Failed to connect to the browser. Make sure it is running with remote debugging enabled.',
    ja: 'ブラウザへの接続に失敗しました。リモートデバッグが有効で起動しているか確認してください。'
  },
  loginBrowserClosed: {
    en: 'Browser session was closed or login was aborted.',
    ja: 'ブラウザセッションが閉じられたか、ログインが中断されました。'
  },
  loginTimeout: {
    en: 'Login timed out.',
    ja: 'ログインの制限時間を超過しました。'
  },


  // logout
  logoutSuccess: {
    en: 'Session cleared. You are logged out.',
    ja: 'セッションがクリアされました。ログアウトしました。'
  },

  // whoami
  whoamiVerifying: {
    en: 'Verifying session...',
    ja: 'セッションを検証中...'
  },
  whoamiLoggedIn: {
    en: (username: string) => `Logged in as: ${pc.bold(pc.cyan(username))}`,
    ja: (username: string) => `ログイン中: ${pc.bold(pc.cyan(username))}`
  },

  // new
  newContestDirExists: {
    en: (contestId: string) => `Contest directory "${contestId}" already exists. If you want to recreate it, please delete or rename it manually first.`,
    ja: (contestId: string) => `コンテストディレクトリ "${contestId}" は既に存在します。再作成したい場合は、手動で削除またはリネームしてください。`
  },
  newIntro: {
    en: (contestId: string) => `Scaffolding Contest: ${contestId}`,
    ja: (contestId: string) => `コンテストのセットアップ開始: ${contestId}`
  },
  newFetchingTasks: {
    en: (contestId: string) => `Fetching tasks for contest ${contestId}...`,
    ja: (contestId: string) => `コンテスト ${contestId} の問題を読み込み中...`
  },
  newFoundTasks: {
    en: (count: number) => `Found ${count} tasks.`,
    ja: (count: number) => `${count} 個の問題が見つかりました。`
  },
  newNoTasksFound: {
    en: (contestId: string) => `No tasks found for contest "${contestId}". Make sure the contest ID is correct.`,
    ja: (contestId: string) => `コンテスト "${contestId}" の問題が見つかりませんでした。コンテストIDが正しいか確認してください。`
  },
  newLabelNotFound: {
    en: (label: string, contestId: string, available: string) => `Task label "${label}" not found in contest "${contestId}". Available tasks: ${available}`,
    ja: (label: string, contestId: string, available: string) => `問題ラベル "${label}" がコンテスト "${contestId}" に見つかりません。利用可能な問題: ${available}`
  },
  newMultiselectMessage: {
    en: "Which tasks do you want to set up? (Space: select, 'a': toggle all, Enter: confirm)",
    ja: "どの問題をセットアップしますか？（Space: 選択, 'a': 全選択/解除, Enter: 決定）"
  },
  newCancelled: {
    en: 'Scaffolding cancelled.',
    ja: 'セットアップがキャンセルされました。'
  },
  newSettingUpTask: {
    en: (label: string, id: string) => `Setting up task ${label} (${id})...`,
    ja: (label: string, id: string) => `問題 ${label} (${id}) をセットアップ中...`
  },
  newSetupSuccess: {
    en: (label: string, count: number) => `Task ${label} set up with ${count} samples.`,
    ja: (label: string, count: number) => `問題 ${label} を ${count} 個のサンプルでセットアップしました。`
  },
  newScaffoldingComplete: {
    en: (count: number) => `Scaffolding complete for ${count} task(s).`,
    ja: (count: number) => `${count} 個の問題のセットアップが完了しました。`
  },
  newStatementSkippedContestActiveTitle: {
    en: '[WARNING] Problem statement extraction skipped',
    ja: '【警告】問題文の抽出をスキップしました'
  },
  newStatementSkippedContestActiveBody: {
    en: '• Problem statement Markdown was NOT downloaded because this contest is currently active.',
    ja: '・コンテスト実施中のため、問題文のMarkdownのダウンロードをスキップしました。'
  },
  newStatementWarningTitle: {
    en: '[WARNING] Automatic problem statement extraction is enabled',
    ja: '【警告】問題文の自動抽出が有効化されています'
  },
  newStatementWarningBody: {
    en: '• DO NOT feed the problem statement Markdown to Generative AI during a rated contest (violates rules).\n• DO NOT publish or share the extracted problem statement on the internet (e.g. public GitHub repos).',
    ja: '・コンテスト中に問題文のMarkdownを生成AIに読み込ませないでください（ルール違反となります）。\n・抽出した問題文をそのままインターネット（GitHubパブリックリポジトリ等）に公開・共有しないでください。'
  },

  // play
  playIntro: {
    en: (contestId: string, label: string) => `Playing solution for ${contestId}/${label}`,
    ja: (contestId: string, label: string) => `実行中: ${contestId}/${label}`
  },
  playCompiling: {
    en: 'Compiling...',
    ja: 'コンパイル中...'
  },
  playCompilationFailed: {
    en: 'Compilation failed',
    ja: 'コンパイル失敗'
  },
  playCompiled: {
    en: 'Compilation successful.',
    ja: 'コンパイル成功。'
  },
  playRunningPrompt: {
    en: 'Running solution. Enter input below (Ctrl+D to finish):',
    ja: 'プログラムを実行しています。以下に入力してください (終了は Ctrl+D):'
  },
  playFinished: {
    en: 'Process finished successfully.',
    ja: '実行が正常に終了しました。'
  },

  // test
  testIntro: {
    en: (contestId: string, label: string) => `Running tests for ${contestId}/${label}`,
    ja: (contestId: string, label: string) => `テスト実行中: ${contestId}/${label}`
  },
  testRetrievingLimits: {
    en: 'Retrieving problem time limits...',
    ja: '問題の実行時間制限を取得中...'
  },
  testLoadedLimits: {
    en: (limit: number) => `Loaded limits (Time Limit: ${limit} ms)`,
    ja: (limit: number) => `時間制限をロードしました (制限時間: ${limit} ms)`
  },
  testDefaultLimits: {
    en: 'Using default time limit of 2000 ms (task info not found).',
    ja: 'デフォルトの時間制限 2000 ms を使用します（問題情報が見つかりません）。'
  },
  testDefaultLimitsError: {
    en: 'Using default time limit of 2000 ms.',
    ja: 'デフォルトの時間制限 2000 ms を使用します。'
  },
  testCompilingRunning: {
    en: 'Compiling and running test cases...',
    ja: 'コンパイルおよびテストケース実行中...'
  },
  testFinished: {
    en: 'Test run finished.',
    ja: 'テスト実行が完了しました。'
  },
  testCompilationFailed: {
    en: 'Compilation Failed:',
    ja: 'コンパイル失敗:'
  },
  testNoSamples: {
    en: 'No sample test cases found in tests/ directory.',
    ja: 'tests/ ディレクトリにサンプルテストケースが見つかりませんでした。'
  },
  testOutroPassed: {
    en: 'All tests passed! 🎉',
    ja: 'すべてのテストに合格しました！ 🎉'
  },
  testOutroFailed: {
    en: 'Some tests failed. 😢',
    ja: 'テストに失敗しました。 😢'
  },

  // submit
  submitPreparing: {
    en: (contestId: string, label: string) => `Preparing Submission for ${contestId}/${label}`,
    ja: (contestId: string, label: string) => `提出準備中: ${contestId}/${label}`
  },
  submitRetrievingLimits: {
    en: 'Retrieving problem time limits for testing...',
    ja: 'テスト用の実行時間制限を取得中...'
  },
  submitRunningTests: {
    en: 'Running local tests...',
    ja: 'ローカルテストを実行中...'
  },
  submitNoSamples: {
    en: 'No sample test cases found. Skipping tests.',
    ja: 'サンプルテストケースが見つかりませんでした。テストをスキップします。'
  },
  submitTestsFailed: {
    en: 'Some local test cases failed!',
    ja: '一部のローカルテストケースが不合格でした！'
  },
  submitConfirmMessage: {
    en: 'Do you still want to submit to AtCoder?',
    ja: 'AtCoder にコードを提出しますか？'
  },
  submitAborted: {
    en: 'Submission aborted.',
    ja: '提出が中止されました。'
  },
  submitTestsPassed: {
    en: 'All local tests passed! Proceeding to submit...',
    ja: 'すべてのローカルテストに合格しました！提出中...'
  },
  submitSubmitting: {
    en: 'Submitting code...',
    ja: 'コードを提出中...'
  },
  submitSuccess: {
    en: (id: string) => `Submitted successfully! Submission ID: ${pc.bold(id)}`,
    ja: (id: string) => `提出が成功しました！ 提出ID: ${pc.bold(id)}`
  },
  submitWaitingJudge: {
    en: 'Waiting for judge status...',
    ja: 'ジャッジ状況を待機中...'
  },
  submitJudgeFinished: {
    en: (status: string) => `Judge Finished: ${status}`,
    ja: (status: string) => `ジャッジ完了: ${status}`
  },
  submitAccepted: {
    en: 'Accepted! 🎉',
    ja: '正解 (AC) です！ 🎉'
  },
  submitFailed: {
    en: 'Judge Failed.',
    ja: 'ジャッジ失敗。'
  },
  submitTimeout: {
    en: 'Polling timed out.',
    ja: 'タイムアウトしました。'
  },
  submitTimeoutWarn: {
    en: (url: string) => `The submission status was not determined in time. View details at: https://atcoder.jp${url}`,
    ja: (url: string) => `時間内に提出ステータスを判定できませんでした。詳細は以下で確認してください: https://atcoder.jp${url}`
  },
  submitTurnstileDetected: {
    en: 'AtCoder\'s bot protection (Turnstile) is active for this contest. We will switch to manual submission.',
    ja: 'このコンテストではAtCoderのボット保護機能（Turnstile）が有効です。手動提出用のページを開きます。'
  },
  submitRejected: {
    en: 'Submission rejected by AtCoder. Please verify if your session is valid or if you are rate-limited.',
    ja: 'AtCoderにより提出が拒否されました。ログイン状態や短時間での連続提出でないか確認してください。'
  },
  submitFallbackMessage: {
    en: (langName: string) => `Submission page opened in your browser. Please select the appropriate language and submit your code manually.`,
    ja: (langName: string) => `ブラウザで提出用ページを開きました。適切な言語を選択し、手動でコードを提出してください。`
  },
  submitFallbackMessageWithClipboard: {
    en: `Submission page opened in your browser and your code has been copied to the clipboard.\nPlease select the appropriate language, paste (Cmd+V / Ctrl+V), and submit manually.`,
    ja: `ブラウザで提出用ページを開きました。コードはクリップボードにコピーされていますので、貼り付けて（Ctrl+V / Cmd+V）手動で提出してください。`
  },
  submitAutomatedFallback: {
    en: 'We have launched the browser with your code pasted and language selected. Please review and click "Submit". The browser will close automatically.',
    ja: 'コードの貼り付けと言語選択を完了した状態でブラウザを起動しました。内容を確認して「提出」ボタンを押してください。提出完了後にブラウザは自動的に閉じます。'
  },
  submitManualSubmission: {
    en: 'Manual Submission',
    ja: '手動提出へ切り替え'
  },

  // open
  openRetrievingUrl: {
    en: 'Retrieving task URL from AtCoder...',
    ja: 'AtCoder から問題の URL を取得中...'
  },
  openSuccess: {
    en: (url: string) => `Opened browser: ${url}`,
    ja: (url: string) => `ブラウザで開きました: ${url}`
  },
  openTaskNotFound: {
    en: (label: string, contestId: string) => `Task "${label}" was not found in contest "${contestId}".`,
    ja: (label: string, contestId: string) => `問題 "${label}" がコンテスト "${contestId}" に見つかりませんでした。`
  },
  openFailed: {
    en: (msg: string) => `Failed to open problem page: ${msg}`,
    ja: (msg: string) => `問題ページを開くのに失敗しました: ${msg}`
  },

  // lang command
  langSuccess: {
    en: (l: string) => `Display language changed to: ${l}`,
    ja: (l: string) => `表示言語を変更しました: ${l}`
  },
  langInvalid: {
    en: 'Invalid language. Please specify "en" or "ja".',
    ja: '無効な言語です。"en" または "ja" を指定してください。'
  },
  langWorkspaceRequired: {
    en: 'Display language can only be configured inside an AtCoder workspace. Please run "atc init" first.',
    ja: '表示言語の設定は AtCoder ワークスペース内でのみ可能です。先に "atc init" を実行してください。'
  },
  langCommandUsage: {
    en: 'Usage: atc lang <en|ja>',
    ja: '使い方: atc lang <en|ja>'
  },
  langSelectMessage: {
    en: 'Select display language:',
    ja: '表示言語を選択してください:'
  },
  langCancelled: {
    en: 'Language selection cancelled.',
    ja: '言語選択がキャンセルされました。'
  },
  submitSessionExpired: {
    en: 'Session expired or invalid. Please log in again using "atc login".',
    ja: 'セッションの期限が切れているか無効です。"atc login" を実行して再ログインしてください。'
  },
  submitLangSelectNotFound: {
    en: 'Language selection element not found on submit page. Please make sure you are logged in and the contest has started.',
    ja: '提出ページに言語選択要素が見つかりませんでした。ログイン状態であること、およびコンテストが開始されていることを確認してください。'
  },
  addLangSelectName: {
    en: 'Select the programming language to add:',
    ja: '追加するプログラミング言語を選択してください:'
  },
  addLangSelectOther: {
    en: 'Other (Specify...)',
    ja: 'その他 (直接入力)'
  },
  addLangAlreadyExists: {
    en: (lang: string) => `Language "${lang}" is already configured.`,
    ja: (lang: string) => `言語 "${lang}" は既に設定されています。`
  },
  addLangEnterName: {
    en: 'Enter the programming language name to add:',
    ja: '追加するプログラミング言語名を入力してください:'
  },
  addLangNameNotEmpty: {
    en: 'Language name cannot be empty.',
    ja: '言語名は空にすることはできません。'
  },
  addLangCancelled: {
    en: 'Language addition cancelled.',
    ja: '言語の追加がキャンセルされました。'
  },
  addLangEnterExtension: {
    en: (lang: string) => `Enter file extension for ${lang}:`,
    ja: (lang: string) => `${lang} のファイル拡張子を入力してください:`
  },
  addLangExtNotEmpty: {
    en: 'Extension cannot be empty.',
    ja: '拡張子は空にすることはできません。'
  },
  addLangEnterBuildCmd: {
    en: 'Enter build command (leave empty if not needed):',
    ja: 'ビルドコマンドを入力してください (不要な場合は空欄のまま):'
  },
  addLangEnterRunCmd: {
    en: 'Enter execution command:',
    ja: '実行コマンドを入力してください:'
  },
  addLangRunCmdNotEmpty: {
    en: 'Execution command cannot be empty.',
    ja: '実行コマンドは空にすることはできません。'
  },
  addLangSpinner: {
    en: 'Adding language configuration...',
    ja: '言語設定を追加中...'
  },
  addLangSuccess: {
    en: (lang: string) => `Language "${lang}" added successfully!`,
    ja: (lang: string) => `言語 "${lang}" が正常に追加されました！`
  },
  defaultLangSelectMessage: {
    en: 'Select the new default programming language:',
    ja: '新しいデフォルトのプログラミング言語を選択してください:'
  },
  defaultLangNotConfigured: {
    en: (lang: string) => `Language "${lang}" is not configured in this workspace. Please add it first using "atc add-lang".`,
    ja: (lang: string) => `言語 "${lang}" はこのワークスペースで設定されていません。先に "atc add-lang" で追加してください。`
  },
  defaultLangSuccess: {
    en: (lang: string) => `Default programming language successfully changed to: ${lang}`,
    ja: (lang: string) => `デフォルトのプログラミング言語を正常に変更しました: ${lang}`
  },
  defaultLangCancelled: {
    en: 'Default language change cancelled.',
    ja: 'デフォルト言語の変更がキャンセルされました。'
  },
  // doctor & setup commands
  descDoctor: {
    en: 'Diagnose discrepancies between local toolchains and AtCoder environments',
    ja: 'ローカルのコンパイラ・処理系バージョンとAtCoderの環境を比較・診断します'
  },
  descSetup: {
    en: 'Setup and install required compilers or language managers based on diagnosis',
    ja: '診断結果に基づき、コンパイラやバージョン管理ツールのインストール・設定を行います'
  },
  doctorIntro: {
    en: 'AtCoder Next - Toolchain Diagnosis',
    ja: 'AtCoder Next - 開発環境診断'
  },
  doctorSpinnerDetecting: {
    en: 'Detecting OS and package managers...',
    ja: 'OSとパッケージマネージャを検出中...'
  },
  doctorSpinnerFetchingCompilers: {
    en: 'Fetching compiler list from AtCoder...',
    ja: 'AtCoderからコンパイラ一覧を取得中...'
  },
  doctorFetchFailed: {
    en: 'Failed to fetch compilers from AtCoder.',
    ja: 'AtCoderからコンパイラ一覧の取得に失敗しました。'
  },
  doctorDetectDone: {
    en: 'System detection complete.',
    ja: 'システム環境の検出が完了しました。'
  },
  doctorNoLanguagesConfigured: {
    en: "No languages are configured. Please run 'atc init' first.",
    ja: '言語設定がありません。先に \'atc init\' を実行してください。'
  },
  doctorSelectLanguages: {
    en: "Select languages to diagnose: (Space: select, 'a': toggle all, Enter: confirm)",
    ja: "診断対象の言語を選択してください: (Space: 選択, 'a': 全選択/解除, Enter: 決定)"
  },
  doctorCheckingVersions: {
    en: 'Checking local and remote versions...',
    ja: 'ローカルおよびリモートのバージョンをチェック中...'
  },
  doctorCheckDone: {
    en: 'Comparison complete.',
    ja: 'バージョン比較が完了しました。'
  },
  doctorResultsTitle: {
    en: 'Diagnosis Results',
    ja: '診断結果サマリー'
  },
  doctorNextActionMessage: {
    en: 'What would you like to do next?',
    ja: '次に何を行いますか？'
  },
  doctorNextActionSetup: {
    en: 'Run setup to fix version discrepancies',
    ja: 'setupを実行してバージョン不整合を解決する'
  },
  doctorNextActionExit: {
    en: 'Exit',
    ja: '終了する'
  },
  doctorSetupAllConfirm: {
    en: 'All selected languages are already matching. Run setup anyway?',
    ja: '選択されたすべての言語は既に一致しています。それでもsetupを実行しますか？'
  },
  doctorFinishedNoChanges: {
    en: 'No changes made. Goodbye!',
    ja: '変更はありませんでした。終了します。'
  },
  doctorFinished: {
    en: 'Diagnosis complete. Goodbye!',
    ja: '環境診断が完了しました。'
  },
  setupIntro: {
    en: 'AtCoder Next - Toolchain Setup',
    ja: 'AtCoder Next - 開発環境セットアップ'
  },
  setupSpinnerFetchingCompilers: {
    en: 'Fetching compiler list from AtCoder...',
    ja: 'AtCoderからコンパイラ一覧を取得中...'
  },
  setupFetchFailed: {
    en: 'Failed to fetch compilers from AtCoder.',
    ja: 'AtCoderからコンパイラ一覧の取得に失敗しました。'
  },
  setupDetectDone: {
    en: 'System detection complete.',
    ja: 'システム環境の検出が完了しました。'
  },
  setupNoLanguagesConfigured: {
    en: "No languages are configured. Please run 'atc init' first.",
    ja: '言語設定がありません。先に \'atc init\' を実行してください。'
  },
  setupSelectLanguages: {
    en: "Select languages to setup: (Space: select, 'a': toggle all, Enter: confirm)",
    ja: "セットアップ対象の言語を選択してください: (Space: 選択, 'a': 全選択/解除, Enter: 決定)"
  },
  setupAlreadyMatchesConfirm: {
    en: (langId: string, ver: string) => `Language "${langId}" already matches target version ${ver}. Reinstall?`,
    ja: (langId: string, ver: string) => `言語 "${langId}" のバージョンは既にターゲット (${ver}) と一致しています。再インストールしますか？`
  },
  setupNoInstallMethods: {
    en: (displayName: string, os: string) => `No installation methods found for ${displayName} on OS ${os}.`,
    ja: (displayName: string, os: string) => `OS ${os} 用の ${displayName} のインストール方法が見つかりませんでした。`
  },
  setupSelectStrategy: {
    en: (langId: string, ver: string) => `Select installation method for ${langId} (target: ${ver}):`,
    ja: (langId: string, ver: string) => `${langId} のインストール方法を選択してください (ターゲット: ${ver}):`
  },
  setupNoWorkNeeded: {
    en: 'No setup actions needed. Everything is up to date.',
    ja: '必要なセットアップ操作はありません。すべて最新の状態です。'
  },
  setupExecutionPlanTitle: {
    en: 'Execution Plan',
    ja: '実行計画サマリー'
  },
  setupDryRunComplete: {
    en: 'Dry run completed. No changes were made.',
    ja: 'ドライラン（シミュレーション）が完了しました。変更は行われていません。'
  },
  setupProceedConfirm: {
    en: 'Do you want to proceed with executing this plan?',
    ja: 'この計画を実行しますか？'
  },
  setupAborted: {
    en: 'Setup aborted. No changes made.',
    ja: 'セットアップが中断されました。変更は行われていません。'
  },
  setupExecutingCommand: {
    en: (idx: number, total: number, langId: string, cmd: string) => `[${idx}/${total}] [${langId}] Executing: ${cmd}`,
    ja: (idx: number, total: number, langId: string, cmd: string) => `[${idx}/${total}] [${langId}] 実行中: ${cmd}`
  },
  setupCommandFailed: {
    en: (cmd: string) => `Command failed: ${cmd}`,
    ja: (cmd: string) => `コマンドが失敗しました: ${cmd}`
  },
  setupCommandRetryConfirm: {
    en: 'Would you like to retry the failed command?',
    ja: '失敗したコマンドを再試行しますか？'
  },
  setupExecutionInterrupted: {
    en: 'Execution interrupted.',
    ja: '処理が中断されました。'
  },
  setupExecutionComplete: {
    en: 'Execution completed successfully.',
    ja: 'すべてのコマンドが正常に実行されました。'
  },
  setupApplyConfigConfirm: {
    en: 'Apply configuration changes to settings.json?',
    ja: 'settings.json への設定反映を行いますか？'
  },
  setupConfigAppliedSuccess: {
    en: 'Configuration successfully applied to settings.json.',
    ja: 'settings.json への設定反映が成功しました。'
  },
  setupOutroSuccess: {
    en: (logPath: string) => `Setup completed successfully! Log saved to: ${logPath}`,
    ja: (logPath: string) => `セットアップが正常に完了しました！ ログは ${logPath} に保存されました。`
  },
  setupOutroFailed: {
    en: 'Setup failed.',
    ja: 'セットアップに失敗しました。'
  },
  selectCompiler: {
    en: (langId: string) => `Select compiler for ${langId}:`,
    ja: (langId: string) => `${langId} のコンパイラを選択してください:`
  },
  selectRuntime: {
    en: (langId: string) => `Select runtime/compiler for ${langId}:`,
    ja: (langId: string) => `${langId} の実行環境/コンパイラを選択してください:`
  },
  setupCommandFailedSelect: {
    en: 'Command failed. How would you like to proceed?',
    ja: 'コマンドの実行に失敗しました。どうしますか？'
  },
  setupCommandActionRetry: {
    en: 'Retry this command',
    ja: 'このコマンドを再試行する'
  },
  setupCommandActionSkip: {
    en: 'Skip this command and continue',
    ja: 'このコマンドをスキップして次へ進む'
  },
  setupCommandActionAbort: {
    en: 'Abort setup',
    ja: 'セットアップを中止する'
  },
  setupCancelledSettingsNotApplied: {
    en: 'Cancelled. settings.json was not updated, but already executed installation commands remain.',
    ja: 'キャンセルされました。settings.json への設定反映は行われませんでしたが、実行済みのコマンドはそのまま残ります。'
  },
  setupAbortedHalfway: {
    en: 'Setup aborted. Already executed installation commands remain, but subsequent commands and settings updates were skipped.',
    ja: 'セットアップを中止しました。実行済みのコマンドは残りますが、これ以降の処理および settings.json への反映はスキップされます。'
  },
  newFetchingTasksFailed: {
    en: (contestId: string, msg: string) => `Failed to fetch tasks for contest "${contestId}": ${msg}`,
    ja: (contestId: string, msg: string) => `コンテスト "${contestId}" の問題一覧の取得に失敗しました: ${msg}`
  },
  langConfigNotFound: {
    en: (langKey: string) => `Language configuration for "${langKey}" not found in settings.json`,
    ja: (langKey: string) => `settings.json に "${langKey}" の言語設定が見つかりませんでした。`
  },
  newFetchingProblemPageFailed: {
    en: (taskId: string, msg: string) => `Failed to fetch problem page for "${taskId}": ${msg}`,
    ja: (taskId: string, msg: string) => `問題 "${taskId}" の問題ページの取得に失敗しました: ${msg}`
  },
  newStatementBypassProhibited: {
    en: 'Unexpected problem statement extraction during an active contest. Bypassing contest rules is strictly prohibited.',
    ja: '実施中のコンテストに対する問題文の抽出は許可されていません。コンテストの規則を回避する行為は固く禁止されています。'
  },
  submitTaskDirNotFound: {
    en: (taskLabel: string, contestId: string) => `Task directory "${taskLabel}" not found in contest "${contestId}".`,
    ja: (taskLabel: string, contestId: string) => `コンテスト "${contestId}" の中に問題フォルダ "${taskLabel}" が見つかりませんでした。`
  },
  submitNoSubmitFile: {
    en: 'No \'submitFile\' specified in your language configuration. Setting \'submitFile\' is required for submission.',
    ja: '言語設定に \'submitFile\' が指定されていません。提出するには \'submitFile\' の設定が必要です。'
  },
  submitFileNotFound: {
    en: (submitFileName: string) => `Submit file "${submitFileName}" specified in language configuration was not found. Did the build command fail?`,
    ja: (submitFileName: string) => `言語設定で指定された提出ファイル "${submitFileName}" が見つかりませんでした。ビルドに失敗していませんか？`
  },
  submitAccessPageFailed: {
    en: (msg: string) => `Failed to access AtCoder submit page: ${msg}`,
    ja: (msg: string) => `AtCoderの提出ページへのアクセスに失敗しました: ${msg}`
  },
  submitNoCsrfToken: {
    en: 'Could not find CSRF token. Make sure you are logged in (run "atc login").',
    ja: 'CSRFトークンが見つかりませんでした。ログインしているか確認してください（"atc login" を実行してください）。'
  },
  submitNoLanguagesOnPage: {
    en: 'No language options available on AtCoder submit page.',
    ja: 'AtCoderの提出ページに言語の選択肢が見つかりませんでした。'
  },
  submitNoSubmissionId: {
    en: 'Submission succeeded but could not retrieve the submission ID.',
    ja: '提出は成功しましたが、提出IDを取得できませんでした。'
  },
  submitFailedWithErr: {
    en: (msg: string) => `Failed to submit code: ${msg}`,
    ja: (msg: string) => `コードの提出に失敗しました: ${msg}`
  },
  langNonInteractive: {
    en: 'Non-interactive environment detected. Please specify the language name as an argument.',
    ja: '非インタラクティブ環境が検出されました。引数で言語名を指定してください。'
  },
  addLangNonInteractive: {
    en: 'Non-interactive environment detected. Please specify the programming language name as an argument.',
    ja: '非インタラクティブ環境が検出されました。引数でプログラミング言語名を指定してください。'
  },
  addLangPromptNonInteractive: {
    en: 'Non-interactive environment detected. Prompt inputs cannot be requested.',
    ja: '非インタラクティブ環境が検出されました。プロンプトからの入力を求めることはできません。'
  },
  defaultLangNonInteractive: {
    en: 'Non-interactive environment detected. Please specify the default language name as an argument.',
    ja: '非インタラクティブ環境が検出されました。引数でデフォルトの言語名を指定してください。'
  },
  defaultLangNoLanguages: {
    en: 'No languages configured in this workspace. Please run "atc init" or "atc add-lang".',
    ja: 'このワークスペースには言語設定がありません。"atc init" または "atc add-lang" を実行してください。'
  },
  loginNonInteractive: {
    en: 'Non-interactive environment detected. Interactive login is not supported in this mode.',
    ja: '非インタラクティブ環境が検出されました。このモードではインタラクティブなログインはサポートされていません。'
  },
  newNonInteractiveWarn: {
    en: 'Non-interactive environment detected. Setting up all tasks automatically.',
    ja: '非インタラクティブ環境が検出されました。すべての問題を自動的にセットアップします。'
  },
  openNoContestId: {
    en: 'Contest ID could not be determined. Please specify it explicitly (e.g., "atc open abc300").',
    ja: 'コンテストIDを判定できませんでした。明示的に指定してください（例: "atc open abc300"）。'
  },
  utilsInWorkspaceRoot: {
    en: 'You are in the workspace root. Please specify a task directory (e.g., "atc test abc300/a").',
    ja: 'ワークスペースのルートにいます。問題のディレクトリを指定してください（例: "atc test abc300/a"）。'
  },
  utilsNoContestId: {
    en: 'Contest ID could not be determined. Please specify it explicitly.',
    ja: 'コンテストIDを判定できませんでした。明示的に指定してください。'
  },
  utilsNoTaskLabel: {
    en: 'Task label could not be determined. Please specify it explicitly.',
    ja: '問題ラベルを判定できませんでした。明示的に指定してください。'
  },
  utilsTaskDirNotFound: {
    en: (resolvedTaskDir: string) => `Task directory not found: "${resolvedTaskDir}"`,
    ja: (resolvedTaskDir: string) => `問題のディレクトリが見つかりませんでした: "${resolvedTaskDir}"`
  },
  runnerTaskDirNotFound: {
    en: (taskArg: string) => `Task directory "${taskArg}" not found.`,
    ja: (taskArg: string) => `問題のディレクトリ "${taskArg}" が見つかりませんでした。`
  },
  runnerSpecifiedFileNotFound: {
    en: (fileArg: string, taskDir: string) => `Specified source file "${fileArg}" not found in "${taskDir}"`,
    ja: (fileArg: string, taskDir: string) => `指定されたソースファイル "${fileArg}" が "${taskDir}" 内に見つかりませんでした。`
  },
  runnerNoLangConfig: {
    en: (ext: string) => `No language configuration found for file extension ".${ext}"`,
    ja: (ext: string) => `ファイル拡張子 ".${ext}" に対応する言語設定が見つかりませんでした。`
  },
  runnerNoSourceFiles: {
    en: (taskDir: string) => `No source files found in "${taskDir}" matching configured languages.`,
    ja: (taskDir: string) => `"${taskDir}" 内に設定済みの言語と一致するソースファイルが見つかりませんでした。`
  },
  runnerTestDirNotFound: {
    en: (testDir: string) => `Test directory "${testDir}" not found.`,
    ja: (testDir: string) => `テストディレクトリ "${testDir}" が見つかりませんでした。`
  },
  bundlerOutsideWorkspace: {
    en: (targetPath: string) => `Access denied: File "${targetPath}" is outside the workspace root.`,
    ja: (targetPath: string) => `アクセスが拒否されました: ファイル "${targetPath}" はワークスペースルートの外にあります。`
  },
  bundlerCircularDep: {
    en: (stack: string, absolutePath: string) => `Circular dependency detected: ${stack} -> ${absolutePath}`,
    ja: (stack: string, absolutePath: string) => `循環依存関係が検出されました: ${stack} -> ${absolutePath}`
  },
  bundlerFileNotFound: {
    en: (input: string) => `File not found: ${input}`,
    ja: (input: string) => `ファイルが見つかりません: ${input}`
  },
  bundlerSameInOut: {
    en: (input: string) => `Input file and output file cannot be the same: "${input}".`,
    ja: (input: string) => `入力ファイルと出力ファイルに同じファイルを指定することはできません: "${input}"`
  },
  bundlerFailedJsTs: {
    en: (input: string, msg: string) => `Failed to bundle JS/TS file "${input}": ${msg}`,
    ja: (input: string, msg: string) => `JS/TSファイル "${input}" のバンドルに失敗しました: ${msg}`
  },
  bundlerUnsupportedFileType: {
    en: (type: string) => `Unsupported file type: "${type}".`,
    ja: (type: string) => `サポートされていないファイル形式です: "${type}"`
  },
  bundlerIncludedFileNotFound: {
    en: (importPath: string, currentDir: string) => `Included file "${importPath}" not found (searched relative to "${currentDir}", workspace root, and CWD).`,
    ja: (importPath: string, currentDir: string) => `インクルードされたファイル "${importPath}" が見つかりませんでした（"${currentDir}" からの相対パス、ワークスペースルート、およびカレントワーキングディレクトリを検索しました）。`
  },
  bundlerFailedToBundleIncluded: {
    en: (importPath: string, absolutePath: string, msg: string) => `Failed to bundle "${importPath}" included in "${absolutePath}": ${msg}`,
    ja: (importPath: string, absolutePath: string, msg: string) => `"${absolutePath}" にインクルードされている "${importPath}" のバンドルに失敗しました: ${msg}`
  },
  testHeaderCompileError: {
    en: '──────────────────────── Compilation Error ────────────────────────',
    ja: '──────────────────────── コンパイルエラー ────────────────────────'
  },
  testBorder: {
    en: '───────────────────────────────────────────────────────────────────',
    ja: '───────────────────────────────────────────────────────────────────'
  },
  testExpectedOutput: {
    en: 'Expected Output:',
    ja: '期待される出力 (Expected):'
  },
  testActualOutput: {
    en: 'Actual Output:',
    ja: '実際の出力 (Actual):'
  },
  testErrorOutput: {
    en: 'Error Output:',
    ja: 'エラー出力:'
  },
  testStatusAC: {
    en: (label: string, duration: string, memory: string) => `[AC] ${label}: Passed (${duration}${memory})`,
    ja: (label: string, duration: string, memory: string) => `[AC] ${label}: パスしました (${duration}${memory})`
  },
  testStatusWA: {
    en: (label: string, duration: string, memory: string) => `[WA] ${label}: Failed (${duration}${memory})`,
    ja: (label: string, duration: string, memory: string) => `[WA] ${label}: 失敗しました (${duration}${memory})`
  },
  testStatusRE: {
    en: (label: string, duration: string, memory: string) => `[RE] ${label}: Runtime Error (${duration}${memory})`,
    ja: (label: string, duration: string, memory: string) => `[RE] ${label}: 実行時エラー (${duration}${memory})`
  },
  testStatusTLE: {
    en: (label: string, limit: number) => `[TLE] ${label}: Time Limit Exceeded (Limit: ${limit} ms)`,
    ja: (label: string, limit: number) => `[TLE] ${label}: 実行時間制限超過 (制限時間: ${limit} ms)`
  },
  playRunningFailed: {
    en: (msg: string) => `Failed to start the process: ${msg}`,
    ja: (msg: string) => `プロセスの起動に失敗しました: ${msg}`
  },
  playTerminatedSignal: {
    en: (signal: string) => `Process terminated with signal ${signal}`,
    ja: (signal: string) => `プロセスがシグナル ${signal} で終了しました。`
  },
  playExitedCode: {
    en: (code: number) => `Process exited with code ${code}`,
    ja: (code: number) => `プロセスがコード ${code} で終了しました。`
  },
  submitYesProceed: {
    en: 'Proceeding with submission automatically due to --yes option.',
    ja: '--yes オプションが指定されたため、自動的に提出を実行します。'
  },
  submitAbortingNonInteractive: {
    en: 'Aborting submission automatically in non-interactive environment due to test failures.',
    ja: 'テストが失敗したため、非インタラクティブ環境下で自動的に提出を中止します。'
  },
  submitManualRequired: {
    en: 'Manual Submit Required',
    ja: '手動提出が必要です'
  },
  submitPollingStatus: {
    en: (status: string) => `Judge Status: ${status}`,
    ja: (status: string) => `ジャッジ状況: ${status}`
  },
  submitNetworkRetry: {
    en: (msg: string) => `Polling status... (network retry: ${msg})`,
    ja: (msg: string) => `状況を取得中... (ネットワーク再試行: ${msg})`
  },
  submitDone: {
    en: 'Done.',
    ja: '完了。'
  },
  bundlerBundlingFiles: {
    en: 'Bundling files...',
    ja: 'ファイルをバンドル中...'
  },
  doctorNoToolchain: {
    en: (langId: string) => `No toolchain definition found for language "${langId}". Skipping.`,
    ja: (langId: string) => `言語 "${langId}" のツールチェーン定義が見つかりませんでした。スキップします。`
  },
  doctorNoAtCoderTarget: {
    en: (langId: string) => `Could not find target compiler on AtCoder for language "${langId}". Skipping.`,
    ja: (langId: string) => `言語 "${langId}" のAtCoder上のターゲットコンパイラが見つかりませんでした。スキップします。`
  },
  doctorAlreadyMatches: {
    en: (langId: string, ver: string) => `[${langId}] Already matches AtCoder version: ${ver}. Skipping setup.`,
    ja: (langId: string, ver: string) => `[${langId}] すでにAtCoderのバージョンと一致しています: ${ver}。セットアップをスキップします。`
  },
  setupSkipInstall: {
    en: 'Skip installation',
    ja: 'インストールをスキップする'
  },
  setupCommandToRun: {
    en: 'Commands to run:',
    ja: '実行されるコマンド:'
  },
  setupConfigChanges: {
    en: 'Configuration (settings.json) changes:',
    ja: '設定ファイル (settings.json) の変更内容:'
  },
  setupWarningSudo: {
    en: '⚠️ WARNING: Some commands require elevated privileges (sudo).',
    ja: '⚠️ 警告: 一部のコマンドの実行には管理者権限 (sudo) が必要です。'
  },
  setupSkippedCommand: {
    en: (cmd: string) => `Skipped command: ${cmd}`,
    ja: (cmd: string) => `コマンドをスキップしました: ${cmd}`
  },
  setupUninstallHints: {
    en: 'Uninstall commands (for reference):',
    ja: 'アンインストールコマンド (参考用):'
  },
  cliDebugDesc: {
    en: 'Enable debug output and stack trace',
    ja: 'デバッグ出力とスタックトレースを有効にします'
  },
  cliYesDesc: {
    en: 'Skip all prompts and use default choices (non-interactive mode)',
    ja: 'すべてのプロンプトをスキップし、デフォルトの選択肢を使用します（非インタラクティブモード）'
  },
  cliUnexpectedError: {
    en: 'An unexpected error occurred.',
    ja: '予期しないエラーが発生しました。'
  },
  cliLanguageCmdDesc: {
    en: 'Manage programming language configurations for the workspace',
    ja: 'ワークスペースのプログラミング言語設定を管理します'
  },
  cliNewAllDesc: {
    en: 'Download all tasks for the contest',
    ja: 'コンテストのすべての問題情報をダウンロードします'
  },
  cliTestFileDesc: {
    en: 'Specify the source file to test',
    ja: 'テスト対象のソースファイルを指定します'
  },
  cliPlayFileDesc: {
    en: 'Specify the source file to run',
    ja: '実行対象のソースファイルを指定します'
  },
  cliSubmitFileDesc: {
    en: 'Specify the source file to submit',
    ja: '提出対象のソースファイルを指定します'
  },
  cliBundleOutputDesc: {
    en: 'Output bundle file',
    ja: 'バンドルファイルの出力先を指定します'
  },
  cliRefreshDesc: {
    en: 'Refresh the AtCoder compiler version cache',
    ja: 'AtCoderのコンパイラバージョンキャッシュを更新します'
  },
  cliSetupDryRunDesc: {
    en: 'Show setup commands and diffs without running them',
    ja: '実際に実行せずに、セットアップコマンドと差分（シミュレーション）を表示します'
  },
  cliSetupYesDesc: {
    en: 'Skip all prompts and use default choices',
    ja: 'すべてのプロンプトをスキップし、デフォルトの選択肢を使用します'
  },
  cliDoctorYesDesc: {
    en: 'Run in non-interactive mode and exit with code 1 if mismatch found',
    ja: '非インタラクティブモードで実行し、バージョンの不整合が見つかった場合は終了コード1で終了します'
  },
  authCookieNotEmpty: {
    en: 'REVEL_SESSION cookie value cannot be empty.',
    ja: 'REVEL_SESSION クッキーの値を空にすることはできません。'
  },
  authInvalidCookieExtract: {
    en: 'Could not extract a valid REVEL_SESSION value.',
    ja: '有効な REVEL_SESSION クッキー値を抽出できませんでした。'
  },
  authCookieInvalidOrExpired: {
    en: (msg: string) => `The provided REVEL_SESSION cookie is invalid or expired: ${msg}`,
    ja: (msg: string) => `指定された REVEL_SESSION クッキーが無効か期限切れです: ${msg}`
  },
  authNoActiveSession: {
    en: 'No active session. Please log in using "atc login".',
    ja: '有効なセッションが見つかりません。"atc login" を実行してログインしてください。'
  },
  authSessionInvalidOrExpired: {
    en: 'Session is invalid or expired.',
    ja: 'セッションが無効か期限切れです。'
  },
  authVerifyFailed: {
    en: (msg: string) => `Failed to verify session: ${msg}`,
    ja: (msg: string) => `セッションの検証に失敗しました: ${msg}`
  }
};

/**
 * Translates a key into the active language.
 */
export const t = (key: keyof typeof MESSAGES, locale: Locale, ...args: any[]): string => {
  const item = MESSAGES[key];
  if (!item) return String(key);
  const msg = (item as any)[locale] || (item as any)['en'];
  if (typeof msg === 'function') {
    return msg(...args);
  }
  return msg;
};

export const h = (key: keyof typeof MESSAGES, locale?: Locale): string => {
  const item = MESSAGES[key];
  if (!item) return String(key);
  if (locale) {
    const msg = (item as any)[locale];
    if (msg) {
      if (typeof msg === 'function') {
        return msg('(args)');
      }
      return msg;
    }
  }
  const en = (item as any)['en'] || '';
  const ja = (item as any)['ja'] || '';
  if (typeof en === 'function') {
    return en('(args)');
  }
  return `${en} | ${ja}`;
};
