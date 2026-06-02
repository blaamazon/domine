import { Injectable, UnauthorizedException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private readonly prisma: PrismaService) {}

  async register(dto: { email: string; password: string }) {
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
    });

    const tokens = this.generateTokens(user.id);

    return {
      user: { id: user.id, email: user.email },
      ...tokens,
    };
  }

  async login(dto: { email: string; password: string }) {
    const user = await this.prisma.authUser.findUnique({
      where: { email: dto.email },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = this.generateTokens(user.id);

    return {
      user: { id: user.id, email: user.email },
      ...tokens,
    };
  }

  async refresh(dto: { refreshToken: string }) {
    // Verify refresh token
    // In production, look up in DB and validate
    try {
      const payload = jwt.verify(
        dto.refreshToken,
        process.env.JWT_REFRESH_SECRET || 'refresh-secret',
      ) as { sub: string };

      const tokens = this.generateTokens(payload.sub);
      return tokens;
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(dto: { refreshToken: string }) {
    // In production, revoke the refresh token in DB
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
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }

  async initiateOAuth(provider: string) {
    // Stub for OAuth flow initiation
    return { url: `https://accounts.google.com/o/oauth2/auth?...` };
  }

  async handleOAuthCallback(provider: string, body: any) {
    // Stub for OAuth callback handling
    return { message: `OAuth ${provider} callback handled` };
  }

  private generateTokens(userId: string) {
    const accessToken = jwt.sign(
      { sub: userId },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '15m' },
    );

    const refreshToken = jwt.sign(
      { sub: userId },
      process.env.JWT_REFRESH_SECRET || 'refresh-secret',
      { expiresIn: '30d' },
    );

    return { accessToken, refreshToken };
  }
}