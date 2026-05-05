import { Module, Global } from '@nestjs/common';
import { AgentGateway } from './agent.gateway';
import { AgentService } from './agent.service';

@Global()
@Module({
  providers: [AgentGateway, AgentService],
  exports: [AgentGateway],
})
export class AgentModule {}
