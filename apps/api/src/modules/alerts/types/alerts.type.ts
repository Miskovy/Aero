import {
  AlertRule,
  Organization,
  Service,
} from '../../../../generated/prisma/client';

export type RuleWithRelations = AlertRule & {
  organization: Organization;
  service: Service | null;
};
