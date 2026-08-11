import { Injectable, BadRequestException } from '@nestjs/common';
import { Prisma, Team } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TeamsService {
  constructor(private readonly prisma: PrismaService) {}

  private db(tx?: Prisma.TransactionClient) {
    return tx ?? this.prisma;
  }

  async listOrgTeams(orgId: string, tx?: Prisma.TransactionClient): Promise<Team[]> {
    if (!orgId) {
      throw new BadRequestException('Invalid Organization ID');
    }
    return await this.db(tx).team.findMany({
      where: {
        organization_id: orgId,
      },
    });
  }

  async getTeambyId(teamId: string, tx?: Prisma.TransactionClient): Promise<Team> {
    if (!teamId) {
      throw new BadRequestException('Invalid Team ID');
    }
    const team = await this.db(tx).team.findUnique({
      where: {
        id: teamId,
      },
    });

    if (!team) {
      throw new BadRequestException('Team not found');
    }
    return team;
  }

  async createTeam(
    data: Prisma.TeamCreateInput | Prisma.TeamUncheckedCreateInput,
    tx?: Prisma.TransactionClient,
  ) {
    return await this.db(tx).team.create({ data });
  }

  async updateTeam(
    teamId: string,
    data: Prisma.TeamUpdateInput | Prisma.TeamUncheckedUpdateInput,
    tx?: Prisma.TransactionClient,
  ) {
    return await this.db(tx).team.update({ where: { id: teamId }, data });
  }

  async deleteTeam(teamId: string, tx?: Prisma.TransactionClient) {
    try {
      return await this.db(tx).team.delete({ where: { id: teamId } });
    } catch {
      throw new BadRequestException('Error occurred while deleting team, There Exists Members');
    }
  }
}