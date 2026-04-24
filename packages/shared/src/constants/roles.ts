export const ORG_ROLES = {
  OWNER: 'owner',
  ADMIN: 'admin',
  DEVELOPER: 'developer',
  VIEWER: 'viewer',
} as const;

export type OrgRole = typeof ORG_ROLES[keyof typeof ORG_ROLES];

export const TEAM_ROLES = {
  LEAD: 'lead',
  MEMBER: 'member',
} as const;

export type TeamRole = typeof TEAM_ROLES[keyof typeof TEAM_ROLES];

export const NODE_ROLES = {
  MANAGER: 'manager',
  WORKER: 'worker',
} as const;

export type NodeRole = typeof NODE_ROLES[keyof typeof NODE_ROLES];
