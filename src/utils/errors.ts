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
    super(`Authentication failed: ${message}`);
  }
}

export class ParseError extends AtcError {
  constructor(message: string) {
    super(`Parsing failed: ${message}`);
  }
}

export class TestError extends AtcError {
  constructor(message: string) {
    super(`Test execution failed: ${message}`);
  }
}
