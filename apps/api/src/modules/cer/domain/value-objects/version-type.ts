export const VERSION_TYPES = ['INITIAL', 'ANNUAL_UPDATE', 'PATCH_UPDATE'] as const;
export type VersionType = (typeof VERSION_TYPES)[number];

export function isValidVersionType(value: string): value is VersionType {
  return VERSION_TYPES.includes(value as VersionType);
}

export function getVersionTypeLabel(type: VersionType): string {
  const labels: Record<VersionType, string> = {
    INITIAL: 'Initial Release',
    ANNUAL_UPDATE: 'Annual Update',
    PATCH_UPDATE: 'Patch Update',
  };
  return labels[type];
}

/**
 * Calculates the next version number based on the current version and update type.
 *
 * Version format: MAJOR.MINOR.PATCH
 * - INITIAL: always returns "1.0.0"
 * - ANNUAL_UPDATE: increments MAJOR (e.g., "1.2.3" -> "2.0.0")
 * - PATCH_UPDATE: increments PATCH (e.g., "1.2.3" -> "1.2.4")
 */
export function getNextVersionNumber(currentVersion: string, type: VersionType): string {
  if (type === 'INITIAL') {
    return '1.0.0';
  }

  const parts = currentVersion.split('.');
  const major = parseInt(parts[0] ?? '0', 10);
  const minor = parseInt(parts[1] ?? '0', 10);
  const patch = parseInt(parts[2] ?? '0', 10);

  if (isNaN(major) || isNaN(minor) || isNaN(patch)) {
    throw new Error(`Invalid version format: ${currentVersion}`);
  }

  if (type === 'ANNUAL_UPDATE') {
    return `${major + 1}.0.0`;
  }

  // PATCH_UPDATE
  return `${major}.${minor}.${patch + 1}`;
}
