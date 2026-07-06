import { ToolchainDefinition } from '../types';

export const rustDefinition: ToolchainDefinition = {
  id: "rust",
  displayName: "Rust",
  detect: {
    command: "rustc --version",
    versionRegex: /rustc (\d+\.\d+\.\d+)/,
  },
  versionManager: {
    id: "rustup",
    detectCommand: "rustup --version",
    selfInstallSteps: [
      { command: "curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh",
        description: "rustup公式インストールスクリプトを実行します" },
    ],
    buildInstallSteps: (version) => [{
      command: `rustup install ${version}`,
      description: `Rustツールチェーンの指定バージョン ${version} をインストールします`
    }],
    buildApplyLocalVersionSteps: (version) => [
      { command: `rustup override set ${version} --path .`,
        description: "このディレクトリにのみバージョンを固定します" },
    ],
  },
  installMethods: {
    linux: [
      { packageManager: "apt", versionSpecificity: "latest-only", requiresElevatedPrivileges: true,
        buildInstallSteps: () => [{ command: "sudo apt-get install -y rustc" }],
        buildUninstallSteps: () => [{ command: "sudo apt-get remove -y rustc" }] },
    ],
    macos: [
      { packageManager: "brew", versionSpecificity: "latest-only", requiresElevatedPrivileges: false,
        buildInstallSteps: () => [{
          command: "brew install rust",
          description: "Rust コンパイラをインストールします"
        }],
        buildUninstallSteps: () => [{ command: "brew uninstall rust" }] },
    ],
    windows: [
      { packageManager: "winget", versionSpecificity: "latest-only", requiresElevatedPrivileges: false,
        buildInstallSteps: () => [{ command: "winget install Rustlang.Rustup --accept-source-agreements --accept-package-agreements" }],
        buildUninstallSteps: () => [{ command: "winget uninstall Rustlang.Rustup" }] },
    ],
  },
};
