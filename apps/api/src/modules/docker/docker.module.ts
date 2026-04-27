import { Module, forwardRef } from '@nestjs/common';
import { DockerService } from './docker.service';
import { ContainerService } from './container.service';
import { VaultModule } from '../vault/vault.module';
import { NetworkingModule } from '../networking/networking.module';

@Module({
  imports: [VaultModule, forwardRef(() => NetworkingModule)],
  providers: [DockerService, ContainerService],
  exports: [DockerService, ContainerService],
})
export class DockerModule {}