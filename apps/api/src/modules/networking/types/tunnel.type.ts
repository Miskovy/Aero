import {
  Project,
  Organization,
  Service,
} from '../../../../generated/prisma/client';

export type ServiceWithRelations = Service & {
  project: Project & { organization: Organization };
};
