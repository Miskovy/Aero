import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
  Res,
  BadRequestException,
  Query
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthGuard } from '@nestjs/passport';
import { Request, Response } from 'express';
import { User } from 'generated/prisma';
import { JwtStrategy } from './strategies/jwt.strategy';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService , private readonly jwtStrategy: JwtStrategy) { }

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'The user has been successfully registered.' })
  @ApiResponse({ status: 409, description: 'Email already exists.' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('login')
  @ApiOperation({ summary: 'User login' })
  @ApiResponse({ status: 200, description: 'Returns the access token.' })
  @ApiResponse({ status: 401, description: 'Invalid credentials.' })
  async login(@Body() loginDto: LoginDto) {
    const user = await this.authService.login(loginDto);
    return user;
  }

  // --- GitHub OAuth Routes ---

  // The Trigger Route
  @Get('github')
  @UseGuards(AuthGuard('github'))
  async githubAuth(@Query('client') client: string, @Res() res: Response) {
    // Store the client origin in a short-lived cookie
    await res.cookie('auth_client', client || 'web', { maxAge: 300000, httpOnly: true });
  }

  // The Callback
  @Get('github/callback')
  @UseGuards(AuthGuard('github'))
  githubAuthCallback(@Req() req: Request & { user: User }, @Res() res: Response) {
    const jwt = this.jwtStrategy.generateToken(req.user);

    // Read the cookie to know where to send them
    const client = req.cookies['auth_client'];
    res.clearCookie('auth_client'); // Clean up

    if (client === 'desktop') {
      return res.redirect(`aero-app://auth?token=${jwt.access_token}`);
    } else if (client === 'cli') {
      return res.redirect(`http://localhost:8080/callback?token=${jwt.access_token}`);
    } else {
      return res.redirect(`http://localhost:5173/login?token=${jwt.access_token}`);
    }
  }

  @Post('github/exchange')
  @ApiOperation({ summary: 'Exchange GitHub token for Aero JWT (Device Flow)' })
  @ApiResponse({ status: 200, description: 'Returns the access token.' })
  exchangeGithubToken(@Body('accessToken') accessToken: string) {
    if (!accessToken) throw new BadRequestException('accessToken is required');
    return this.authService.exchangeGithubToken(accessToken);
  }
}
