import { Module, forwardRef } from '@nestjs/common';
import { DockerService } from './docker.service';
import { ContainerService } from './container.service';
import { VaultModule } from '../vault/vault.module';
import { NetworkingModule } from '../networking/networking.module';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule, VaultModule, forwardRef(() => NetworkingModule)],
  providers: [DockerService, ContainerService],
  exports: [DockerService, ContainerService],
})
export class DockerModule {}
