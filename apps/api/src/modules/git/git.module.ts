import { Global, Module } from '@nestjs/common';
import { GitSourcesService } from './git-sources.service';
import { GitService } from './git.service';
@Global()
@Module({
  providers: [GitSourcesService , GitService],
  exports: [GitSourcesService],
})
export class GitModule {}
