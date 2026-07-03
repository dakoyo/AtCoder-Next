import { ToolchainDefinition } from '../types';

export const clangDefinition: ToolchainDefinition = {
  id: "clang",
  displayName: "Clang",
  detect: {
    command: "clang --version",
    versionRegex: /clang.*?version\s*(\d+\.\d+\.\d+)/i,
  },
  installMethods: {
    linux: [
      {
        packageManager: "apt",
        versionSpecificity: "exact",
        requiresElevatedPrivileges: true,
        buildInstallSteps: (version) => {
          const major = version.split(".")[0];
          return [{ command: `sudo apt-get install -y clang-${major}`,
                     description: `clang-${major} をインストールします` }];
        },
        buildUninstallSteps: (version) => {
          const major = version.split(".")[0];
          return [{ command: `sudo apt-get remove -y clang-${major}` }];
        },
      },
      {
        packageManager: "dnf",
        versionSpecificity: "latest-only",
        requiresElevatedPrivileges: true,
        buildInstallSteps: () => [
          { command: "sudo dnf install -y clang",
            description: "clang をインストールします（バージョン指定不可、最新版が入ります）" },
        ],
        buildUninstallSteps: () => [{ command: "sudo dnf remove -y clang" }],
      },
      {
        packageManager: "pacman",
        versionSpecificity: "latest-only",
        requiresElevatedPrivileges: true,
        buildInstallSteps: () => [
          { command: "sudo pacman -S --noconfirm clang",
            description: "clang をインストールします（ローリングリリースのため常に最新）" },
        ],
        buildUninstallSteps: () => [{ command: "sudo pacman -R clang" }],
      },
    ],
    macos: [
      {
        packageManager: "brew",
        versionSpecificity: "exact",
        requiresElevatedPrivileges: false,
        buildInstallSteps: (version) => {
          const major = version.split(".")[0];
          return [{
            command: `brew install llvm@${major}`,
            description: `C/C++ (Clang) コンパイラ llvm@${major} をインストールします`
          }];
        },
        buildUninstallSteps: (version) => {
          const major = version.split(".")[0];
          return [{ command: `brew uninstall llvm@${major}` }];
        },
      },
    ],
    windows: [
      {
        packageManager: "winget",
        versionSpecificity: "latest-only",
        requiresElevatedPrivileges: false,
        buildInstallSteps: () => [
          { command: "winget install LLVM.LLVM",
            description: "LLVM/Clang をインストールします" },
        ],
        buildUninstallSteps: () => [{ command: "winget uninstall LLVM.LLVM" }],
      },
    ],
  },
};
