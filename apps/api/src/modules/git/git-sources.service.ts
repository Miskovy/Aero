import { Injectable, InternalServerErrorException, Logger, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { simpleGit, SimpleGit } from 'simple-git';
import { Octokit } from '@octokit/rest';
import { VaultService } from '../vault/vault.service';
import { PrismaService } from '../../prisma/prisma.service';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';

export interface Repository {
  id: number;
  name: string;
  fullName: string;
  cloneUrl: string;
}

export interface WebhookData {
  branch: string;
  commitSha: string;
  repository: string;
  provider: string;
}

interface GitHubPayload {
  ref?: string;
  after?: string;
  head_commit?: { id: string };
  repository?: { full_name: string };
}

interface GitLabPayload {
  ref?: string;
  checkout_sha?: string;
  commits?: Array<{ id: string }>;
  project?: { path_with_namespace: string };
}

@Injectable()
export class GitSourcesService {
  private readonly logger = new Logger(GitSourcesService.name);
  private readonly vaultService: VaultService;
  private readonly prisma: PrismaService;

  async clone(gitUrl: string, branch: string, commitSha?: string): Promise<string> {
    // Create a unique temporary directory for the clone
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'git-repo-'));
    const git: SimpleGit = simpleGit(tempDir);

    this.logger.log(`Cloning ${gitUrl} into ${tempDir}...`);

    try {
      // Clone only the specific branch to save time and bandwidth
      await git.clone(gitUrl, '.', ['--branch', branch, '--single-branch']);

      // If a specific commit is provided, check it out
      if (commitSha) {
        this.logger.log(`Checking out commit ${commitSha}...`);
        await git.checkout(commitSha);
      }

      return tempDir; // Return the path so other services can build/read the files
    } catch (error) {
      this.logger.error(`Failed to clone repository: ${error.message}`);
      // Clean up the folder if cloning fails
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => null);
      throw new InternalServerErrorException('Failed to clone repository');
    }
  }

  async listRepos(sourceId: string): Promise<Repository[]> {
    try {

      const sourceRecord = await this.prisma.gitSource.findUnique({
        where: { id: sourceId }
      });

      if (!sourceRecord || !sourceRecord.access_token_encrypted) {
        throw new UnauthorizedException('Git connection not found or token is missing.');
      }

      const githubToken = this.vaultService.decrypt(
        sourceRecord.access_token_encrypted,
        sourceRecord.iv,
        sourceRecord.auth_tag,
        sourceRecord.key_version
      );

      const octokit = new Octokit({ auth: githubToken });

      // 3. Production Pagination: This automatically loops and fetches ALL pages 
      // instead of silently dropping repositories after the first 100.
      const allRepositories = await octokit.paginate(octokit.rest.repos.listForAuthenticatedUser, {
        visibility: 'all',
        sort: 'updated',
        per_page: 100,
      });

      return allRepositories.map((repo) => ({
        id: repo.id,
        name: repo.name,
        fullName: repo.full_name,
        cloneUrl: repo.clone_url,
      }));

    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Failed to list repositories: ${error.message}`);
      } else {
        this.logger.error(`Failed to list repositories: ${String(error)}`);
      }
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new InternalServerErrorException('Failed to fetch repositories from GitHub');
    }
  }

  validateWebhookSignature(payload: Buffer, signature: string, secret: string): boolean {
    if (!signature || !payload) return false;

    try {
      const signatureParts = signature.split('=');
      const algorithm = signatureParts[0];
      const hash = signatureParts[1];

      if (!hash || algorithm !== 'sha256') {
        return false;
      }

      const hmac = crypto.createHmac(algorithm, secret);
      const digest = Buffer.from(algorithm + '=' + hmac.update(payload).digest('hex'), 'utf8');
      const checksum = Buffer.from(signature, 'utf8');

      if (digest.length !== checksum.length) {
        return false;
      }

      return crypto.timingSafeEqual(digest, checksum);
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Webhook validation failed: ${error.message}`);
      } else {
        this.logger.error(`Webhook validation failed: ${String(error)}`);
      }
      return false;
    }
  }

  parseWebhookPayload(provider: string, rawPayload: unknown): WebhookData {
    const lowerProvider = provider.toLowerCase();

    if (lowerProvider === 'github') {
      const payload = rawPayload as GitHubPayload;
      const ref = payload.ref || '';

      return {
        provider: 'github',
        branch: ref.replace('refs/heads/', ''),
        commitSha: payload.after || payload.head_commit?.id || '',
        repository: payload.repository?.full_name || '',
      };
    }

    if (lowerProvider === 'gitlab') {
      const payload = rawPayload as GitLabPayload;
      const ref = payload.ref || '';

      return {
        provider: 'gitlab',
        branch: ref.replace('refs/heads/', ''),
        commitSha: payload.checkout_sha || payload.commits?.[0]?.id || '',
        repository: payload.project?.path_with_namespace || '',
      };
    }

    throw new BadRequestException(`Unsupported Git provider: ${provider}`);
  }
}