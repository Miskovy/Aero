import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { VaultService } from '../vault/vault.service';
import { CreateSecretDto, UpdateSecretDto } from './dto/create-secret.dto';

@Injectable()
export class SecretsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly vaultService: VaultService,
  ) {}

  async createSecret(serviceId: string, dto: CreateSecretDto) {
    const existing = await this.prisma.serviceSecret.findUnique({
      where: {
        service_id_key: { service_id: serviceId, key: dto.key },
      },
    });

    if (existing) {
      throw new ConflictException(`Secret with key ${dto.key} already exists for this service`);
    }

    const { encryptedValue, iv, authTag, version } = this.vaultService.encrypt(dto.value);

    const secret = await this.prisma.serviceSecret.create({
      data: {
        service_id: serviceId,
        key: dto.key,
        encrypted_value: encryptedValue,
        iv,
        auth_tag: authTag,
        key_version: version,
        description: dto.description,
      },
      select: {
        id: true,
        key: true,
        description: true,
        created_at: true,
        updated_at: true,
      }
    });

    return secret;
  }

  async listSecrets(serviceId: string) {
    // Note: Never return the decrypted value in listing
    return this.prisma.serviceSecret.findMany({
      where: { service_id: serviceId },
      select: {
        id: true,
        key: true,
        description: true,
        created_at: true,
        updated_at: true,
      },
    });
  }

  async updateSecret(serviceId: string, secretId: string, dto: UpdateSecretDto) {
    const secret = await this.prisma.serviceSecret.findUnique({
      where: { id: secretId },
    });

    if (!secret || secret.service_id !== serviceId) {
      throw new NotFoundException('Secret not found');
    }

    const { encryptedValue, iv, authTag, version } = this.vaultService.encrypt(dto.value);

    return this.prisma.serviceSecret.update({
      where: { id: secretId },
      data: {
        encrypted_value: encryptedValue,
        iv,
        auth_tag: authTag,
        key_version: version,
        description: dto.description !== undefined ? dto.description : secret.description,
        updated_at: new Date(),
      },
      select: {
        id: true,
        key: true,
        description: true,
        created_at: true,
        updated_at: true,
      }
    });
  }

  async deleteSecret(serviceId: string, secretId: string) {
    const secret = await this.prisma.serviceSecret.findUnique({
      where: { id: secretId },
    });

    if (!secret || secret.service_id !== serviceId) {
      throw new NotFoundException('Secret not found');
    }

    await this.prisma.serviceSecret.delete({
      where: { id: secretId },
    });

    return { success: true };
  }
}
