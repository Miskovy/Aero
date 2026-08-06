import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Req,
  NotFoundException,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UserService } from './user.service';
import { User as UserModel } from '../../generated/prisma/client';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AuthenticatedRequest } from '../common/interfaces/Authenticated.interface';

@ApiTags('Users')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  /**
   * Strips sensitive fields from a User object before returning to the client.
   */
  private sanitizeUser(user: UserModel) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password_hash, two_factor_secret, ...safe } = user;
    return {
      ...safe,
      has_password: !!password_hash,
    };
  }

  @Post()
  @ApiOperation({ summary: 'Create a new user directly' })
  @ApiResponse({ status: 201, description: 'The created user.' })
  async createUser(@Body() userData: CreateUserDto): Promise<UserModel> {
    return this.userService.createUser(userData);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the currently authenticated user profile' })
  @ApiResponse({ status: 200, description: 'The authenticated user profile.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async getMe(@Req() req: AuthenticatedRequest) {
    const userId = req.user?.id;
    if (!userId) throw new NotFoundException('User not authenticated');
    const user = await this.userService.user({ id: userId });
    if (!user) throw new NotFoundException('User not found');
    return this.sanitizeUser(user);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update the currently authenticated user profile' })
  @ApiResponse({ status: 200, description: 'The updated user profile.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async updateMe(
    @Req() req: AuthenticatedRequest,
    @Body() userData: UpdateUserDto,
  ) {
    const userId = req.user?.id;
    if (!userId) throw new NotFoundException('User not authenticated');
    // Only allow updating name (not email/password via this endpoint)
    const updatedUser = await this.userService.updateUser({
      where: { id: userId },
      data: { name: userData.name },
    });
    return this.sanitizeUser(updatedUser);
  }

  @Patch('me/password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update the currently authenticated user password' })
  @ApiResponse({ status: 200, description: 'Password updated successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid passwords or mismatch.' })
  async updatePassword(
    @Req() req: AuthenticatedRequest,
    @Body() passwordData: UpdatePasswordDto,
  ) {
    const userId = req.user?.id;
    if (!userId) throw new NotFoundException('User not authenticated');
    await this.userService.updatePassword(userId, passwordData);
    return { message: 'Password updated successfully' };
  }

  @Patch('me/agree-terms')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Agree to Terms of Service and Privacy Policy' })
  @ApiResponse({ status: 200, description: 'User legal acceptance updated successfully.' })
  async agreeToTerms(@Req() req: AuthenticatedRequest) {
    const userId = req.user?.id;
    if (!userId) throw new NotFoundException('User not authenticated');
    const updatedUser = await this.userService.agreeToLegal(userId);
    return this.sanitizeUser(updatedUser);
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
  async getUserById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<UserModel | null> {
    return this.userService.user({ id });
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a user by ID' })
  @ApiParam({ name: 'id', description: 'The user ID' })
  @ApiResponse({ status: 200, description: 'The updated user.' })
  async updateUser(
    @Param('id', ParseUUIDPipe) id: string,
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
  async deleteUser(@Param('id', ParseUUIDPipe) id: string): Promise<UserModel> {
    return this.userService.deleteUser({ id });
  }
}
