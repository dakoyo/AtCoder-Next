export type OS = "linux" | "macos" | "windows";
export type PackageManager = "apt" | "dnf" | "pacman" | "brew" | "winget" | "scoop";

/** バージョン指定の粒度。パッケージマネージャによって対応が異なる。 */
export type VersionSpecificity =
  | "exact"        // 例: apt の g++-12 のようにバージョン別パッケージが存在
  | "latest-only"; // 例: pacman は常に最新版のみ、バージョン指定不可

/** 実行される1コマンド単位。UIでの表示にそのまま使う。 */
export interface InstallStep {
  command: string;
  description?: string;
}

/** 1つのインストール手段（OS × パッケージマネージャの組み合わせ）を表す。 */
export interface InstallMethod {
  packageManager: PackageManager;
  versionSpecificity: VersionSpecificity;

  /**
   * 前提コマンド（PPA追加、リポジトリ鍵登録など）。
   * バージョン指定が必要な場合のみ発生することが多いため関数化する。
   */
  prerequisites?: (version: string) => InstallStep[];

  /** 実際のインストールコマンドを生成する。 */
  buildInstallSteps: (version: string) => InstallStep[];

  /** アンインストールコマンド。setup完了後の案内表示に使う。 */
  buildUninstallSteps: (version: string) => InstallStep[];

  /** このインストール方法がシステム全体に影響するか（sudo要否の判定に使う）。 */
  requiresElevatedPrivileges: boolean;
}

/** pyenv/nvm/rustupのような専用バージョンマネージャの定義。 */
export interface VersionManagerDefinition {
  id: string;
  detectCommand: string;
  selfInstallSteps: InstallStep[];
  buildInstallSteps: (version: string) => InstallStep[];
  buildApplyLocalVersionSteps?: (version: string) => InstallStep[];
}

/** 言語・ツール単位の定義（例: gcc, clang, python3, node, rustup）。 */
export interface ToolchainDefinition {
  id: string;
  displayName: string;

  detect: {
    command: string;
    versionRegex: RegExp;
  };

  /**
   * OS別の複数インストール手段。優先順位は配列の先頭が高い。
   */
  installMethods: Partial<Record<OS, InstallMethod[]>>;

  /**
   * 専用バージョンマネージャ経由の定義。存在する場合、
   * OS標準パッケージマネージャより優先して提案する。
   */
  versionManager?: VersionManagerDefinition;
}

export interface ResolvedInstallPlan {
  strategy: "version-manager" | "package-manager";
  steps: InstallStep[];
  requiresElevatedPrivileges: boolean;
  uninstallHint: InstallStep[];
}
