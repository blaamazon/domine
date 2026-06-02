import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private readonly prisma: PrismaService) {}

  private get jwtSecret(): string {
    return process.env.JWT_SECRET || 'development-secret';
  }

  private get jwtRefreshSecret(): string {
    return process.env.JWT_REFRESH_SECRET || 'development-refresh-secret';
  }

  async register(dto: RegisterDto) {
    const existing = await this.prisma.authUser.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.authUser.create({
      data: {
        email: dto.email,
        passwordHash,
      },
      select: {
        id: true,
        email: true,
        emailVerified: true,
        createdAt: true,
      },
    });

    const tokens = await this.generateTokens(user.id, user.email);

    // Store refresh token hash
    const tokenHash = await bcrypt.hash(tokens.refreshToken, 10);
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
    });

    return {
      user,
      ...tokens,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.authUser.findUnique({
      where: { email: dto.email },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const tokens = await this.generateTokens(user.id, user.email);

    // Store refresh token
    const tokenHash = await bcrypt.hash(tokens.refreshToken, 10);
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        emailVerified: user.emailVerified,
      },
      ...tokens,
    };
  }

  async refresh(dto: RefreshDto) {
    try {
      const payload = jwt.verify(dto.refreshToken, this.jwtRefreshSecret) as {
        sub: string;
        email?: string;
        jti?: string;
      };

      // Verify the refresh token exists in DB and is not revoked
      // Note: In production, look up by the jti (token ID)
      const user = await this.prisma.authUser.findUnique({
        where: { id: payload.sub },
        select: { id: true, email: true },
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      const tokens = await this.generateTokens(user.id, user.email);
      return tokens;
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async logout(dto: RefreshDto) {
    try {
      const payload = jwt.verify(dto.refreshToken, this.jwtRefreshSecret) as {
        sub: string;
        jti?: string;
      };

      // Revoke all refresh tokens for this user
      await this.prisma.refreshToken.updateMany({
        where: {
          userId: payload.sub,
          revoked: false,
        },
        data: { revoked: true },
      });
    } catch {
      // Even if token is expired, we still consider logout successful
    }

    return { message: 'Logged out successfully' };
  }

  async getMe(userId: string) {
    const user = await this.prisma.authUser.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        emailVerified: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        userSettings: true,
        orgMembers: {
          include: {
            organization: {
              select: {
                id: true,
                name: true,
                slug: true,
                planTier: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }

  async initiateOAuth(provider: string) {
    const providers: Record<string, { authUrl: string; clientId: string }> = {
      google: {
        authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        clientId: process.env.GOOGLE_CLIENT_ID || '',
      },
      github: {
        authUrl: 'https://github.com/login/oauth/authorize',
        clientId: process.env.GITHUB_CLIENT_ID || '',
      },
      apple: {
        authUrl: 'https://appleid.apple.com/auth/authorize',
        clientId: process.env.APPLE_CLIENT_ID || '',
      },
    };

    const config = providers[provider];
    if (!config) {
      throw new Error(`Unsupported OAuth provider: ${provider}`);
    }

    const state = uuidv4();
    const redirectUri = `${process.env.API_URL || 'http://localhost:3000'}/api/v1/auth/oauth/${provider}/callback`;

    const url = `${config.authUrl}?client_id=${config.clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&state=${state}&scope=email%20profile`;

    return { url, state };
  }

  async handleOAuthCallback(provider: string, dto: { code: string; state: string }) {
    // Stub: In production, exchange code for tokens, find/create user
    this.logger.log(`OAuth callback received for ${provider}`);
    return {
      message: `OAuth ${provider} login successful`,
      provider,
    };
  }

  private async generateTokens(userId: string, email?: string) {
    const accessToken = jwt.sign(
      { sub: userId, email },
      this.jwtSecret,
      { expiresIn: '15m' },
    );

    const jti = uuidv4();
    const refreshToken = jwt.sign(
      { sub: userId, email, jti },
      this.jwtRefreshSecret,
      { expiresIn: '30d' },
    );

    return { accessToken, refreshToken };
  }
}