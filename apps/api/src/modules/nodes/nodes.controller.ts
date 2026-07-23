import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Headers,
  UseGuards,
  Req,
  Patch,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { NodesService } from './nodes.service';
import { CreateNodeDto } from './dto/node.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthenticatedRequest } from '../../common/interfaces/Authenticated.interface';
import { UpdateNodeDto } from './dto/updateNode.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';

@ApiTags('Nodes / Servers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('organizations/:orgId/nodes')
export class NodesController {
  constructor(private readonly nodesService: NodesService) {}

  @Get('optimal')
  @ApiOperation({ summary: 'Get optimal placement node for service scheduling' })
  async selectOptimalNode(@Param('orgId') orgId: string) {
    return this.nodesService.selectOptimalNode(orgId);
  }

  @Get()
  @ApiOperation({ summary: 'List all connected servers for an organization' })
  async listNodes(
    @Param('orgId') orgId: string,
    @Req() req: AuthenticatedRequest,
    @Query() pagination: PaginationDto,
  ) {
    const userId = req.user?.id;
    return this.nodesService.listNodes(orgId, pagination, userId);
  }

  @Post()
  @ApiOperation({
    summary: 'Register a new server and generate a pairing token',
  })
  async createNode(
    @Param('orgId') orgId: string,
    @Body() dto: CreateNodeDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user?.id;
    return this.nodesService.createNode(orgId, dto, userId);
  }

  @Delete(':nodeId')
  @ApiOperation({ summary: 'Revoke access for a server' })
  async removeNode(
    @Param('orgId') orgId: string,
    @Param('nodeId') nodeId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user?.id;
    return this.nodesService.removeNode(orgId, nodeId, userId);
  }

  @Get(':nodeId')
  @ApiOperation({ summary: 'Get a specific server' })
  async getNode(
    @Param('orgId') orgId: string,
    @Param('nodeId') nodeId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user?.id;
    return this.nodesService.getNode(orgId, nodeId, userId);
  }

  @Patch(':nodeId')
  @ApiOperation({ summary: 'Update a specific server' })
  async updateNode(
    @Param('orgId') orgId: string,
    @Param('nodeId') nodeId: string,
    @Body() dto: UpdateNodeDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user?.id;
    return this.nodesService.updateNode(orgId, nodeId, dto, userId);
  }
}

@ApiTags('Nodes / Telemetry')
@Controller('nodes')
export class NodeHeartbeatController {
  constructor(private readonly nodesService: NodesService) {}

  @Post('heartbeat')
  @ApiOperation({ summary: 'Record agent telemetry heartbeat' })
  async recordHeartbeat(
    @Headers('x-agent-token') headerToken: string,
    @Body()
    dto: {
      agentToken?: string;
      cpuUsage?: number;
      memoryUsage?: number;
      systemInfo?: Record<string, any>;
      ipAddress?: string;
    },
  ) {
    const token = headerToken || dto.agentToken || '';
    return this.nodesService.recordHeartbeat(token, dto);
  }
}
