import { ToolchainDefinition } from '../types';

export const pypyDefinition: ToolchainDefinition = {
  id: "pypy",
  displayName: "PyPy",
  detect: {
    command: "pypy3 --version",
    versionRegex: /PyPy\s*(\d+\.\d+\.\d+)/i,
  },
  versionManager: {
    id: "pyenv",
    detectCommand: "pyenv --version",
    selfInstallSteps: [
      { command: "curl https://pyenv.run | bash",
        description: "pyenv公式インストールスクリプトを実行します（~/.pyenv 配下に配置）" },
    ],
    buildInstallSteps: (version) => [
      { command: `pyenv install pypy3.10-${version}`,
        description: `PyPy3.10 ${version} をビルドします（時間がかかる場合があります）` },
    ],
    buildApplyLocalVersionSteps: (version) => [
      { command: `pyenv local pypy3.10-${version}`, description: "このコンテストディレクトリにのみ適用します" },
    ],
  },
  installMethods: {
    linux: [
      { packageManager: "apt", versionSpecificity: "latest-only", requiresElevatedPrivileges: true,
        buildInstallSteps: () => [{ command: "sudo apt-get install -y pypy3", description: "PyPy3 をインストールします" }],
        buildUninstallSteps: () => [{ command: "sudo apt-get remove -y pypy3" }] },
    ],
    macos: [
      { packageManager: "brew", versionSpecificity: "latest-only", requiresElevatedPrivileges: false,
        buildInstallSteps: () => [
          {
            command: "brew install pypy3",
            description: "PyPy3 をインストールします"
          }
        ],
        buildUninstallSteps: () => [{ command: "brew uninstall pypy3" }] },
    ],
    windows: [
      { packageManager: "winget", versionSpecificity: "latest-only", requiresElevatedPrivileges: false,
        buildInstallSteps: () => [
          { command: "winget install PyPy.PyPy3 --accept-source-agreements --accept-package-agreements", description: "PyPy3 をインストールします" },
        ],
        buildUninstallSteps: () => [{ command: "winget uninstall PyPy.PyPy3" }] },
    ],
  },
};
