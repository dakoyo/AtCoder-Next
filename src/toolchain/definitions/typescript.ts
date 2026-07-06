import { ToolchainDefinition } from '../types';

export const typescriptDefinition: ToolchainDefinition = {
  id: "typescript",
  displayName: "TypeScript",
  detect: {
    command: "tsc --version",
    versionRegex: /Version\s*(\d+\.\d+(?:\.\d+)?)/i,
  },
  installMethods: {
    linux: [
      {
        packageManager: "apt",
        versionSpecificity: "exact",
        requiresElevatedPrivileges: true,
        buildInstallSteps: (version) => [
          { command: `npm install -g typescript@${version}`, description: `TypeScript ${version} をグローバルにインストールします` }
        ],
        buildUninstallSteps: () => [
          { command: "npm uninstall -g typescript" }
        ]
      }
    ],
    macos: [
      {
        packageManager: "brew",
        versionSpecificity: "exact",
        requiresElevatedPrivileges: false,
        buildInstallSteps: (version) => [
          { command: `npm install -g typescript@${version}`, description: `TypeScript ${version} をグローバルにインストールします` }
        ],
        buildUninstallSteps: () => [
          { command: "npm uninstall -g typescript" }
        ]
      }
    ],
    windows: [
      {
        packageManager: "winget",
        versionSpecificity: "exact",
        requiresElevatedPrivileges: false,
        buildInstallSteps: (version) => [
          { command: `npm install -g typescript@${version}`, description: `TypeScript ${version} をグローバルにインストールします` }
        ],
        buildUninstallSteps: () => [
          { command: "npm uninstall -g typescript" }
        ]
      }
    ]
  }
};
