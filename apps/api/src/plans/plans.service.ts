import { Injectable, BadRequestException } from '@nestjs/common';
import { Prisma, Plan } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PlansService {
  constructor(private readonly prisma: PrismaService) {}

  private db(tx?: Prisma.TransactionClient) {
    return tx ?? this.prisma;
  }

  async getAllPlans(tx?: Prisma.TransactionClient): Promise<Plan[]> {
    return await this.db(tx).plan.findMany();
  }

  async createPlan(
    data: Prisma.PlanCreateInput,
    tx?: Prisma.TransactionClient,
  ) {
    return await this.db(tx).plan.create({ data });
  }

  async updatePlan(
    id: string,
    data: Prisma.PlanUpdateInput,
    tx?: Prisma.TransactionClient,
  ) {
    return await this.db(tx).plan.update({ where: { id }, data });
  }

  async deletePlan(id: string, tx?: Prisma.TransactionClient) {
    try {
      return await this.db(tx).plan.delete({ where: { id } });
    } catch {
      throw new BadRequestException(
        'Failed to delete plan, There exists an organization using this plan',
      );
    }
  }

  async getPlan(id: string, tx?: Prisma.TransactionClient): Promise<Plan> {
    if (!id) {
      throw new BadRequestException('Invalid Plan ID');
    }
    const plan = await this.db(tx).plan.findUnique({ where: { id } });
    if (!plan) {
      throw new BadRequestException('Plan not found');
    }
    return plan;
  }

  async getPlanbyName(
    name: string,
    tx?: Prisma.TransactionClient,
  ): Promise<Plan | null> {
    if (!name) {
      throw new BadRequestException('Invalid Plan Name');
    }
    return await this.db(tx).plan.findFirst({
      where: {
        name: {
          equals: name,
          mode: 'insensitive',
        },
      },
    });
  }
}
