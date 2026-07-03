import { OS, ToolchainDefinition, ResolvedInstallPlan, InstallStep } from './types';
import { commandExists } from './detector';

export async function resolveInstallPlan(
  def: ToolchainDefinition,
  targetVersion: string,
  os: OS,
): Promise<ResolvedInstallPlan[]> {
  const plans: ResolvedInstallPlan[] = [];

  // 1. 専用バージョンマネージャが定義されていれば最優先候補として追加
  if (def.versionManager) {
    const vm = def.versionManager;
    const isVmInstalled = commandExists(vm.detectCommand);
    const steps: InstallStep[] = [
      ...(isVmInstalled ? [] : vm.selfInstallSteps),
      ...vm.buildInstallSteps(targetVersion),
      ...(vm.buildApplyLocalVersionSteps?.(targetVersion) ?? []),
    ];
    
    // Determine uninstall command
    let uninstallCmd = `${vm.id} uninstall ${targetVersion}`;
    if (vm.id === 'rustup') {
      uninstallCmd = `rustup toolchain uninstall ${targetVersion}`;
    }
    
    plans.push({
      strategy: "version-manager",
      steps,
      requiresElevatedPrivileges: false,
      uninstallHint: [{ command: uninstallCmd }],
    });
  }

  // 2. OS標準パッケージマネージャの候補も並べる
  const methods = def.installMethods[os] ?? [];
  for (const method of methods) {
    const steps = [
      ...(method.prerequisites?.(targetVersion) ?? []),
      ...method.buildInstallSteps(targetVersion),
    ];
    plans.push({
      strategy: "package-manager",
      steps,
      requiresElevatedPrivileges: method.requiresElevatedPrivileges,
      uninstallHint: method.buildUninstallSteps(targetVersion),
    });
  }

  return plans;
}
