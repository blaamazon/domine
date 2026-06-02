import { Controller, Post, Get, Body, Param, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Create account with email + password' })
  async register(@Body() registerDto: any) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Login, returns JWT + refresh token' })
  async login(@Body() loginDto: any) {
    return this.authService.login(loginDto);
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token' })
  async refresh(@Body() refreshDto: any) {
    return this.authService.refresh(refreshDto);
  }

  @Post('logout')
  @ApiOperation({ summary: 'Revoke refresh token' })
  async logout(@Body() logoutDto: any) {
    return this.authService.logout(logoutDto);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  async getMe(@Req() req: any) {
    return this.authService.getMe(req.user?.userId);
  }

  @Post('oauth/:provider')
  @ApiOperation({ summary: 'Initiate OAuth flow' })
  async oauthInit(@Param('provider') provider: string) {
    return this.authService.initiateOAuth(provider);
  }

  @Post('oauth/:provider/callback')
  @ApiOperation({ summary: 'OAuth callback' })
  async oauthCallback(@Param('provider') provider: string, @Body() body: any) {
    return this.authService.handleOAuthCallback(provider, body);
  }
}