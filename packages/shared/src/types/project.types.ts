import { OrgRole, TeamRole } from '../constants/roles';

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
  authProvider: string;
  twoFactorEnabled: boolean;
  lastLoginAt?: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  plan: string;
  settings: Record<string, any>;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface OrganizationMember {
  id: string;
  organizationId: string;
  userId: string;
  role: OrgRole;
  joinedAt: Date | string;
  user?: User;
}

export interface Team {
  id: string;
  organizationId: string;
  name: string;
  description?: string | null;
  createdAt: Date | string;
}

export interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  role: TeamRole;
  joinedAt: Date | string;
  user?: User;
}

export interface Project {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  description?: string | null;
  settings: Record<string, any>;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface Environment {
  id: string;
  projectId: string;
  name: string;
  slug: string;
  description?: string | null;
  gitBranch?: string | null;
  createdAt: Date | string;
}
