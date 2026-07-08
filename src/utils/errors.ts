import { getSystemLocale } from './i18n';

export class AtcError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class WorkspaceNotFoundError extends AtcError {
  constructor() {
    super('.atcoder-next/ directory was not found. Please run "atc init" in your workspace root first.');
  }
}

export class AuthError extends AtcError {
  constructor(message: string) {
    const isJa = getSystemLocale() === 'ja';
    super(isJa ? `認証に失敗しました: ${message}` : `Authentication failed: ${message}`);
  }
}

export class ParseError extends AtcError {
  constructor(message: string) {
    const isJa = getSystemLocale() === 'ja';
    super(isJa ? `解析に失敗しました: ${message}` : `Parsing failed: ${message}`);
  }
}

export class TestError extends AtcError {
  constructor(message: string) {
    const isJa = getSystemLocale() === 'ja';
    super(isJa ? `テスト実行に失敗しました: ${message}` : `Test execution failed: ${message}`);
  }
}
