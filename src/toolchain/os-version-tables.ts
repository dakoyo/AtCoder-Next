export const UBUNTU_STANDARD_GCC_MAX: Record<string, number> = {
  "20.04": 10,
  "22.04": 12,
  "24.04": 14,
};

export function needsPpa(requestedMajor: string, ubuntuVersion: string): boolean {
  const max = UBUNTU_STANDARD_GCC_MAX[ubuntuVersion];
  return max === undefined || Number(requestedMajor) > max;
}
