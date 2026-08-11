import { Module } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { OrganizationsController } from './organizations.controller';
import { PlansModule } from '../plans/plans.module';
import { TeamsModule } from '../teams/teams.module';

@Module({
  imports: [PlansModule, TeamsModule],
  controllers: [OrganizationsController],
  providers: [OrganizationsService],
  exports: [OrganizationsService],
})
export class OrganizationsModule {}
