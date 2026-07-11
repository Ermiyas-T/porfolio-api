import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  // POST /auth/login — returns { accessToken } on success, 401 on bad credentials
  @ApiOperation({ summary: 'Authenticate admin user' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, description: 'Login successful, JWT set as cookie and returned in body' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.login(dto);
    const isProduction = this.configService.get<string>('NODE_ENV') === 'production';

    response.cookie(
      this.configService.get<string>('AUTH_COOKIE_NAME', 'portfolio_admin_token'),
      result.accessToken,
      {
        httpOnly: true,
        // Production cross-origin cookies require SameSite=None and Secure together
        sameSite: isProduction ? 'none' : 'lax',
        secure: isProduction,
        path: '/',
        maxAge: this.configService.get<number>('AUTH_COOKIE_MAX_AGE_MS', 604800000),
      },
    );

    return result;
  }
}
