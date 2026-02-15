export const UserRole = {
  ADMIN: 'ADMIN',
  RA_MANAGER: 'RA_MANAGER',
  CLINICAL_SPECIALIST: 'CLINICAL_SPECIALIST',
  DATA_SCIENCE: 'DATA_SCIENCE',
  EXECUTIVE: 'EXECUTIVE',
  AUDITOR: 'AUDITOR',
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  ADMIN: 100,
  RA_MANAGER: 80,
  CLINICAL_SPECIALIST: 60,
  DATA_SCIENCE: 60,
  EXECUTIVE: 40,
  AUDITOR: 20,
};
