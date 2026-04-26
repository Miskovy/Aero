import { Injectable, InternalServerErrorException, Logger, BadRequestException } from '@nestjs/common';
import { simpleGit, SimpleGit } from 'simple-git';
import { Octokit } from '@octokit/rest';
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

@Injectable()
export class GitSourcesService {
  private readonly logger = new Logger(GitSourcesService.name);

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
      // TODO: Retrieve the user's GitHub Personal Access Token (PAT) or OAuth token 
      // from your database using the sourceId.
      const githubToken = await this.getMockTokenFromDb(sourceId); 

      const octokit = new Octokit({ auth: githubToken });
      
      // Fetch repositories for the authenticated user
      const { data } = await octokit.rest.repos.listForAuthenticatedUser({
        visibility: 'all',
        sort: 'updated',
        per_page: 100, // Handle pagination in a real-world scenario if needed
      });

      return data.map((repo) => ({
        id: repo.id,
        name: repo.name,
        fullName: repo.full_name,
        cloneUrl: repo.clone_url,
      }));
    } catch (error) {
      this.logger.error(`Failed to list repositories: ${error.message}`);
      throw new InternalServerErrorException('Failed to fetch repositories from GitHub');
    }
  }

  // 3. Validate webhook signature
  async validateWebhookSignature(payload: Buffer, signature: string, secret: string): Promise<boolean> {
    if (!signature || !payload) return false;

    try {
      // GitHub typically sends signatures as 'sha256=HEX_STRING'
      const signatureParts = signature.split('=');
      const algorithm = signatureParts[0]; // e.g., 'sha256'
      const hash = signatureParts[1];

      if (!hash || algorithm !== 'sha256') {
        return false;
      }

      // Generate our own HMAC based on the raw payload and the secret
      const hmac = crypto.createHmac(algorithm, secret);
      const digest = Buffer.from(algorithm + '=' + hmac.update(payload).digest('hex'), 'utf8');
      const checksum = Buffer.from(signature, 'utf8');

      // Prevent Timing Attacks by comparing buffers
      if (digest.length !== checksum.length) {
        return false;
      }

      return crypto.timingSafeEqual(digest, checksum);
    } catch (error) {
      this.logger.error(`Webhook validation failed: ${error.message}`);
      return false;
    }
  }

  // 4. Parse webhook payload to extract branch, commit, etc.
  async parseWebhookPayload(provider: string, payload: any): Promise<WebhookData> {
    provider = provider.toLowerCase();

    if (provider === 'github') {
      // GitHub Push Event Payload Parsing
      const ref = payload.ref || '';
      
      return {
        provider: 'github',
        branch: ref.replace('refs/heads/', ''), // extracts 'main' from 'refs/heads/main'
        commitSha: payload.after || payload.head_commit?.id || '',
        repository: payload.repository?.full_name || '',
      };
    }

    if (provider === 'gitlab') {
      // GitLab Push Event Payload Parsing
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

  // --- Helper Methods ---
  private async getMockTokenFromDb(sourceId: string): Promise<string> {
    // Replace this with actual DB logic to fetch the token associated with sourceId
    return 'ghp_your_mock_token_here'; 
  }
}