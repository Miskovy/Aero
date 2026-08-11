import { Module } from '@nestjs/common';
import { TeamsService } from './teams.service';
import { TeamMembersService } from './teamMembers.service';

@Module({
  providers: [TeamsService, TeamMembersService],
  exports: [TeamsService, TeamMembersService],
})
export class TeamsModule {}
