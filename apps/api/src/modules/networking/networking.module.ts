import { Module, forwardRef } from '@nestjs/common';
import { TraefikService } from './traefik.service';
import { TunnelService } from './tunnel.service';
import { DomainsModule } from '../domains/domains.module';
import { DockerModule } from '../docker/docker.module';
import { VaultModule } from '../vault/vault.module';

@Module({
  imports: [DomainsModule, VaultModule, forwardRef(() => DockerModule)],
  providers: [TraefikService, TunnelService],
  exports: [TraefikService, TunnelService],
})
export class NetworkingModule {}
