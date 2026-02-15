export interface ProtocolVersion {
  major: number;
  minor: number;
}

export function parseVersion(versionStr: string): ProtocolVersion {
  const parts = versionStr.split('.');
  if (parts.length !== 2) {
    throw new Error(`Invalid version format: ${versionStr}. Expected "major.minor"`);
  }
  const major = parseInt(parts[0]!, 10);
  const minor = parseInt(parts[1]!, 10);
  if (isNaN(major) || isNaN(minor) || major < 1 || minor < 0) {
    throw new Error(`Invalid version numbers: ${versionStr}`);
  }
  return { major, minor };
}

export function formatVersion(version: ProtocolVersion): string {
  return `${version.major}.${version.minor}`;
}

export function incrementMinor(version: ProtocolVersion): ProtocolVersion {
  return { major: version.major, minor: version.minor + 1 };
}

export function createInitialVersion(): ProtocolVersion {
  return { major: 1, minor: 0 };
}

export function compareVersions(a: ProtocolVersion, b: ProtocolVersion): number {
  if (a.major !== b.major) return a.major - b.major;
  return a.minor - b.minor;
}
