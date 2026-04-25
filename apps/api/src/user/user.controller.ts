import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { UserService } from './user.service';
import { User as UserModel } from '../../generated/prisma/client';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@ApiTags('Users')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new user directly' })
  @ApiResponse({ status: 201, description: 'The created user.' })
  async createUser(
    @Body() userData: CreateUserDto,
  ): Promise<UserModel> {
    return this.userService.createUser(userData);
  }

  @Get()
  @ApiOperation({ summary: 'Get all users with optional pagination' })
  @ApiResponse({ status: 200, description: 'List of users.' })
  @ApiQuery({ name: 'skip', required: false, type: String })
  @ApiQuery({ name: 'take', required: false, type: String })
  async getUsers(
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ): Promise<UserModel[]> {
    return this.userService.users({
      skip: skip ? Number(skip) : undefined,
      take: take ? Number(take) : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a user by ID' })
  @ApiParam({ name: 'id', description: 'The user ID' })
  @ApiResponse({ status: 200, description: 'The found user.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async getUserById(@Param('id') id: string): Promise<UserModel | null> {
    return this.userService.user({ id });
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a user by ID' })
  @ApiParam({ name: 'id', description: 'The user ID' })
  @ApiResponse({ status: 200, description: 'The updated user.' })
  async updateUser(
    @Param('id') id: string,
    @Body() userData: UpdateUserDto,
  ): Promise<UserModel> {
    return this.userService.updateUser({
      where: { id },
      data: userData,
    });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a user by ID' })
  @ApiParam({ name: 'id', description: 'The user ID' })
  @ApiResponse({ status: 200, description: 'The deleted user.' })
  async deleteUser(@Param('id') id: string): Promise<UserModel> {
    return this.userService.deleteUser({ id });
  }
}
