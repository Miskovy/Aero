import { Injectable } from '@nestjs/common';
import { GitSourcesService } from './git-sources.service';
import { VaultService } from '../vault/vault.service';
import { PrismaService } from '../../prisma/prisma.service';
import { GitProvider } from '../../../generated/prisma/client';

@Injectable()
export class GitService {
  constructor(
    private readonly gitSourcesService: GitSourcesService,
    private readonly vaultService: VaultService,
    private readonly prisma: PrismaService,
  ) {}
  async createGitConnection(
    organizationId: string,
    provider: GitProvider,
    name: string,
    rawToken: string,
  ) {
    const encryptedData = this.vaultService.encrypt(rawToken);

    const newSource = await this.prisma.gitSource.create({
      data: {
        organization_id: organizationId,
        provider: provider,
        name: name,
        access_token_encrypted: encryptedData.encryptedValue,
        iv: encryptedData.iv,
        auth_tag: encryptedData.authTag,
        key_version: encryptedData.version,
      },
    });

    return newSource;
  }
}
