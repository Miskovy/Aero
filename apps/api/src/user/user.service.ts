import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, User } from '../../generated/prisma/client';
import { UpdatePasswordDto } from './dto/update-password.dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async user(
    userWhereUniqueInput: Prisma.UserWhereUniqueInput,
  ): Promise<User | null> {
    return await this.prisma.user.findUnique({
      where: userWhereUniqueInput,
    });
  }

  async users(params: {
    skip?: number;
    take?: number;
    cursor?: Prisma.UserWhereUniqueInput;
    where?: Prisma.UserWhereInput;
    orderBy?: Prisma.UserOrderByWithRelationInput;
  }): Promise<User[]> {
    const { skip, take, cursor, where, orderBy } = params;
    return await this.prisma.user.findMany({
      skip,
      take,
      cursor,
      where,
      orderBy,
    });
  }

  async createUser(data: Prisma.UserCreateInput): Promise<User> {
    return await this.prisma.user.create({
      data,
    });
  }

  async updateUser(params: {
    where: Prisma.UserWhereUniqueInput;
    data: Prisma.UserUpdateInput;
  }): Promise<User> {
    const { where, data } = params;
    return await this.prisma.user.update({
      data,
      where,
    });
  }

  async deleteUser(where: Prisma.UserWhereUniqueInput): Promise<User> {
    return await this.prisma.user.delete({
      where,
    });
  }

  async findFirst(params: {
    where: Prisma.UserWhereInput;
  }): Promise<User | null> {
    return await this.prisma.user.findFirst({
      where: params.where,
    });
  }

  async updatePassword(userId: string, data: UpdatePasswordDto): Promise<void> {
    const user = await this.user({ id: userId });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (data.new_password !== data.confirm_password) {
      throw new BadRequestException(
        'New password and confirmation password do not match',
      );
    }

    if (user.password_hash) {
      if (!data.current_password) {
        throw new BadRequestException('Current password is required');
      }
      const isMatch = await bcrypt.compare(
        data.current_password,
        user.password_hash,
      );
      if (!isMatch) {
        throw new BadRequestException('Incorrect current password');
      }
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(data.new_password, salt);

    await this.updateUser({
      where: { id: userId },
      data: { password_hash: hashedPassword },
    });
  }
}
