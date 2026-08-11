import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, TeamMember } from '../../generated/prisma/client';

@Injectable()
export class TeamMembersService {
  constructor(private readonly prisma: PrismaService) {}

  private db(tx?: Prisma.TransactionClient) {
    return tx ?? this.prisma;
  }

  async listTeamMembers(
    teamId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<TeamMember[]> {
    if (!teamId) {
      throw new BadRequestException('Invalid Team ID');
    }

    const team = await this.db(tx).team.findUnique({
      where: {
        id: teamId,
      },
      include: {
        members: true,
      },
    });

    if (!team) {
      throw new BadRequestException('Team not found');
    }

    return team.members;
  }

  async createTeamMember(
    data: Prisma.TeamMemberCreateInput | Prisma.TeamMemberUncheckedCreateInput,
    tx?: Prisma.TransactionClient,
  ) {
    return await this.db(tx).teamMember.create({ data });
  }

  async deleteTeamMember(
    teamId: string,
    userId: string,
    tx?: Prisma.TransactionClient,
  ) {
    return await this.db(tx).teamMember.delete({
      where: {
        team_id_user_id: {
          team_id: teamId,
          user_id: userId,
        },
      },
    });
  }

  async updateTeamMember(
    teamId: string,
    userId: string,
    data: Prisma.TeamMemberUpdateInput | Prisma.TeamMemberUncheckedUpdateInput,
    tx?: Prisma.TransactionClient,
  ) {
    return await this.db(tx).teamMember.update({
      where: {
        team_id_user_id: {
          team_id: teamId,
          user_id: userId,
        },
      },
      data,
    });
  }

  async getTeamMemberbyId(
    teamId: string,
    userId: string,
    tx?: Prisma.TransactionClient,
  ) {
    return await this.db(tx).teamMember.findUnique({
      where: {
        team_id_user_id: {
          team_id: teamId,
          user_id: userId,
        },
      },
    });
  }
}
