import { Module } from '@nestjs/common';
import { CloudflareService } from './cloudflare.service';
import { DockerModule } from '../docker/docker.module';

@Module({
  imports: [DockerModule],
  providers: [CloudflareService],
  exports: [CloudflareService],
})
export class CloudflareModule {}
