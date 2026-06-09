import { Module, Global } from '@nestjs/common';
import { AgentGateway } from './agent.gateway';
import { AgentService } from './agent.service';
import { TerminalGateway } from './terminal.gateway';

@Global()
@Module({
  providers: [AgentGateway, AgentService, TerminalGateway],
  exports: [AgentGateway],
})
export class AgentModule {}
