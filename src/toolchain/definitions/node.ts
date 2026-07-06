import { ToolchainDefinition } from '../types';

export const nodeDefinition: ToolchainDefinition = {
  id: "node",
  displayName: "Node.js",
  detect: {
    command: "node --version",
    versionRegex: /v(\d+\.\d+\.\d+)/,
  },
  versionManager: {
    id: "nvm",
    detectCommand: "nvm --version",
    selfInstallSteps: [
      { command: "curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash",
        description: "nvm公式インストールスクリプトを実行します" },
    ],
    buildInstallSteps: (version) => [
      { command: process.platform === 'win32'
          ? `nvm install ${version}`
          : `export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && \\. "$NVM_DIR/nvm.sh" && nvm install ${version}`,
        description: `Node.js ${version} をインストールします` },
    ],
    buildApplyLocalVersionSteps: (version) => [
      { command: process.platform === 'win32'
          ? `nvm use ${version}`
          : `export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && \\. "$NVM_DIR/nvm.sh" && nvm use ${version}`,
        description: "現在のシェルセッションに適用します（注意: シェル設定ファイルの再読み込みが必要な場合があります）" },
    ],
  },
  installMethods: {
    linux: [
      { packageManager: "apt", versionSpecificity: "latest-only", requiresElevatedPrivileges: true,
        buildInstallSteps: () => [{ command: "sudo apt-get install -y nodejs npm" }],
        buildUninstallSteps: () => [{ command: "sudo apt-get remove -y nodejs npm" }] },
    ],
    macos: [
      { packageManager: "brew", versionSpecificity: "exact", requiresElevatedPrivileges: false,
        buildInstallSteps: (version) => {
          const major = version.split(".")[0];
          return [{
            command: `brew install node@${major}`,
            description: `Node.js ${major} をインストールします`
          }];
        },
        buildUninstallSteps: (version) => {
          const major = version.split(".")[0];
          return [{ command: `brew uninstall node@${major}` }];
        } },
    ],
    windows: [
      { packageManager: "winget", versionSpecificity: "latest-only", requiresElevatedPrivileges: false,
        buildInstallSteps: () => [
          { command: "winget install OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements" },
        ],
        buildUninstallSteps: () => [{ command: "winget uninstall OpenJS.NodeJS.LTS" }] },
    ],
  },
};
