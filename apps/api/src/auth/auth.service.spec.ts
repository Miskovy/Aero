import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UserService } from '../user/user.service';
import { TokenService } from './token.service';
import { RedisService } from '../redis/redis.service';
import { MailService } from '../mail/mail.service';
import {
  ConflictException,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

jest.mock('bcryptjs', () => ({
  genSalt: jest.fn().mockResolvedValue('salt'),
  hash: jest.fn().mockResolvedValue('$2a$10$hashedpassword'),
  compare: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let userService: Record<string, jest.Mock>;
  let tokenService: Record<string, jest.Mock>;
  let redisService: Record<string, jest.Mock>;
  let mailService: Record<string, jest.Mock>;

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    password_hash: '$2a$10$hashedpassword',
    auth_provider: 'local',
    is_email_verified: true,
  };

  beforeEach(async () => {
    userService = {
      user: jest.fn(),
      createUser: jest.fn(),
      updateUser: jest.fn(),
    };

    tokenService = {
      generateTokenPair: jest.fn(),
      refreshTokens: jest.fn(),
      revokeAllUserTokens: jest.fn(),
      validateAccessToken: jest.fn(),
      generateOAuthExchangeCode: jest.fn(),
      exchangeOAuthCode: jest.fn(),
    };

    redisService = {
      set: jest.fn().mockResolvedValue('OK'),
      get: jest.fn(),
      del: jest.fn(),
    };

    mailService = {
      sendVerificationEmail: jest.fn().mockResolvedValue(true),
      sendForgotPasswordPin: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UserService, useValue: userService },
        { provide: TokenService, useValue: tokenService },
        { provide: RedisService, useValue: redisService },
        { provide: MailService, useValue: mailService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should successfully register a new user', async () => {
      userService.user.mockResolvedValue(null);
      userService.createUser.mockResolvedValue(mockUser);

      const result = await service.register({
        email: 'new@example.com',
        password: 'Password123!',
        name: 'New User',
      });

      expect(userService.user).toHaveBeenCalledWith({
        email: 'new@example.com',
      });
      expect(userService.createUser).toHaveBeenCalled();
      expect(redisService.set).toHaveBeenCalled();
      expect(result.user).toBeDefined();
      expect(result.user.email).toBe(mockUser.email);
    });

    it('should throw ConflictException if email is already taken', async () => {
      userService.user.mockResolvedValue(mockUser);

      await expect(
        service.register({
          email: 'test@example.com',
          password: 'Password123!',
          name: 'Test User',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('should successfully authenticate user and return token pair', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      userService.user.mockResolvedValue(mockUser);
      tokenService.generateTokenPair.mockResolvedValue({
        access_token: 'acc-token',
        refresh_token: 'ref-token',
        expires_in: 900,
      });

      const result = await service.login({
        email: 'test@example.com',
        password: 'Password123!',
      });

      expect(userService.user).toHaveBeenCalledWith({
        email: 'test@example.com',
      });
      expect(userService.updateUser).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { last_login_at: expect.any(Date) as unknown },
      });
      expect(result).toEqual({
        access_token: 'acc-token',
        refresh_token: 'ref-token',
        expires_in: 900,
      });
    });

    it('should throw UnauthorizedException if user does not exist', async () => {
      userService.user.mockResolvedValue(null);

      await expect(
        service.login({
          email: 'missing@example.com',
          password: 'Password123!',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password is invalid', async () => {
      userService.user.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({
          email: 'test@example.com',
          password: 'WrongPassword',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw ForbiddenException if user email is not verified', async () => {
      const unverifiedUser = { ...mockUser, is_email_verified: false };
      userService.user.mockResolvedValue(unverifiedUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(
        service.login({
          email: 'test@example.com',
          password: 'Password123!',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('refreshTokens', () => {
    it('should delegate to tokenService.refreshTokens', async () => {
      tokenService.refreshTokens.mockResolvedValue({
        access_token: 'new-acc',
        refresh_token: 'new-ref',
        expires_in: 900,
      });

      const result = await service.refreshTokens('old-ref');
      expect(tokenService.refreshTokens).toHaveBeenCalledWith('old-ref');
      expect(result.access_token).toBe('new-acc');
    });
  });

  describe('logout', () => {
    it('should delegate to tokenService.revokeAllUserTokens', async () => {
      await service.logout('user-1');
      expect(tokenService.revokeAllUserTokens).toHaveBeenCalledWith('user-1');
    });
  });
});
