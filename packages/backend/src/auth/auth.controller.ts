import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { OAuthCallbackDto } from './dto/oauth-callback.dto';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create account with email + password' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login, returns JWT + refresh token' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  async refresh(@Body() refreshDto: RefreshDto) {
    return this.authService.refresh(refreshDto);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke refresh token' })
  async logout(@Body() refreshDto: RefreshDto) {
    return this.authService.logout(refreshDto);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  async getMe(@CurrentUser('userId') userId: string) {
    return this.authService.getMe(userId);
  }

  @Public()
  @Post('oauth/:provider')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Initiate OAuth flow' })
  async oauthInit(@Param('provider') provider: string) {
    return this.authService.initiateOAuth(provider);
  }

  @Public()
  @Post('oauth/:provider/callback')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'OAuth callback handler' })
  async oauthCallback(
    @Param('provider') provider: string,
    @Body() callbackDto: OAuthCallbackDto,
  ) {
    return this.authService.handleOAuthCallback(provider, callbackDto);
  }
}