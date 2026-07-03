import { ToolchainDefinition } from '../types';

export const pythonDefinition: ToolchainDefinition = {
  id: "python",
  displayName: "Python",
  detect: {
    command: "python3 --version",
    versionRegex: /Python (\d+\.\d+\.\d+)/,
  },
  versionManager: {
    id: "pyenv",
    detectCommand: "pyenv --version",
    selfInstallSteps: [
      { command: "curl https://pyenv.run | bash",
        description: "pyenv公式インストールスクリプトを実行します（~/.pyenv 配下に配置）" },
    ],
    buildInstallSteps: (version) => [
      { command: `pyenv install ${version}`,
        description: `Python ${version} をビルドします（時間がかかる場合があります）` },
    ],
    buildApplyLocalVersionSteps: (version) => [
      { command: `pyenv local ${version}`, description: "このコンテストディレクトリにのみ適用します" },
    ],
  },
  installMethods: {
    linux: [
      { packageManager: "apt", versionSpecificity: "latest-only", requiresElevatedPrivileges: true,
        buildInstallSteps: () => [{ command: "sudo apt-get install -y python3" }],
        buildUninstallSteps: () => [{ command: "sudo apt-get remove -y python3" }] },
    ],
    macos: [
      { packageManager: "brew", versionSpecificity: "exact", requiresElevatedPrivileges: false,
        buildInstallSteps: (version) => {
          const minor = version.split(".").slice(0, 2).join(".");
          return [{
            command: `brew install python@${minor}`,
            description: `Python ${minor} をインストールします`
          }];
        },
        buildUninstallSteps: (version) => {
          const minor = version.split(".").slice(0, 2).join(".");
          return [{ command: `brew uninstall python@${minor}` }];
        } },
    ],
    windows: [
      { packageManager: "winget", versionSpecificity: "exact", requiresElevatedPrivileges: false,
        buildInstallSteps: (version) => [
          { command: `winget install Python.Python.${version.split(".").slice(0, 2).join("")}` },
        ],
        buildUninstallSteps: () => [{ command: "winget uninstall Python.Python.3" }] },
    ],
  },
};
