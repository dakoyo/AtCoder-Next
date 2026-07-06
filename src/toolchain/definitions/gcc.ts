import { ToolchainDefinition } from '../types';
import { needsPpa } from '../os-version-tables';
import { getUbuntuVersion } from '../os/detect-os';

export const gccDefinition: ToolchainDefinition = {
  id: "gcc",
  displayName: "GCC",
  detect: {
    command: "g++ --version",
    versionRegex: /g\+\+.*?(\d+\.\d+\.\d+)/,
  },
  installMethods: {
    linux: [
      {
        packageManager: "apt",
        versionSpecificity: "exact",
        requiresElevatedPrivileges: true,
        prerequisites: (version) => {
          const major = version.split(".")[0];
          const ubuntuVersion = getUbuntuVersion() || "22.04";
          return needsPpa(major, ubuntuVersion)
            ? [
                { command: "sudo add-apt-repository -y ppa:ubuntu-toolchain-r/test",
                  description: "新しいGCCバージョンを含むPPAを追加します" },
                { command: "sudo apt-get update",
                  description: "パッケージリストを更新します" },
              ]
            : [];
        },
        buildInstallSteps: (version) => {
          const major = version.split(".")[0];
          return [{ command: `sudo apt-get install -y g++-${major}`,
                     description: `g++-${major} をインストールします` }];
        },
        buildUninstallSteps: (version) => {
          const major = version.split(".")[0];
          return [{ command: `sudo apt-get remove -y g++-${major}` }];
        },
      },
      {
        packageManager: "dnf",
        versionSpecificity: "latest-only",
        requiresElevatedPrivileges: true,
        buildInstallSteps: () => [
          { command: "sudo dnf install -y gcc-c++",
            description: "gcc-c++ をインストールします（バージョン指定不可、最新版が入ります）" },
        ],
        buildUninstallSteps: () => [{ command: "sudo dnf remove -y gcc-c++" }],
      },
      {
        packageManager: "pacman",
        versionSpecificity: "latest-only",
        requiresElevatedPrivileges: true,
        buildInstallSteps: () => [
          { command: "sudo pacman -S --noconfirm gcc",
            description: "gcc をインストールします（ローリングリリースのため常に最新）" },
        ],
        buildUninstallSteps: () => [{ command: "sudo pacman -R gcc" }],
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
            command: `brew install gcc@${major}`,
            description: `C++ (GCC) コンパイラ gcc@${major} をインストールします`
          }];
        },
        buildUninstallSteps: (version) => {
          const major = version.split(".")[0];
          return [{ command: `brew uninstall gcc@${major}` }];
        },
      },
    ],
    windows: [
      {
        packageManager: "winget",
        versionSpecificity: "latest-only",
        requiresElevatedPrivileges: false,
        prerequisites: () => [
          { command: "powershell -Command \"if (Test-Path C:\\msys64) { Write-Output 'MSYS2 already exists, skipping installation.' } else { winget install MSYS2.MSYS2 --accept-source-agreements --accept-package-agreements }\"",
            description: "MSYS2（GCCのWindows向け配布基盤）をインストールします" },
        ],
        buildInstallSteps: () => [
          { command: `C:\\msys64\\usr\\bin\\bash.exe -lc "pacman -S --noconfirm mingw-w64-x86_64-gcc"`,
            description: "MSYS2内でmingw-w64-gccをインストールします" },
          { command: `powershell -Command "$userPath = [Environment]::GetEnvironmentVariable('Path', 'User'); if ($userPath -notlike '*C:\\msys64\\mingw64\\bin*') { [Environment]::SetEnvironmentVariable('Path', $userPath + ';C:\\msys64\\mingw64\\bin', 'User') }"`,
            description: "C:\\msys64\\mingw64\\bin をユーザー環境変数 PATH に追加します" }
        ],
        buildUninstallSteps: () => [{ command: `C:\\msys64\\usr\\bin\\bash.exe -lc "pacman -R --noconfirm mingw-w64-x86_64-gcc"` }],
      },
    ],
  },
};
