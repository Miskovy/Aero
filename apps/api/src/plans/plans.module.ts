import { Global, Module } from '@nestjs/common';
import { PlansService } from './plans.service';
import { PlanQuotaService } from './plan-quota.service';
import { PlansController } from './plans.controller';

@Global()
@Module({
  providers: [PlansService, PlanQuotaService],
  controllers: [PlansController],
  exports: [PlansService, PlanQuotaService],
})
export class PlansModule {}
