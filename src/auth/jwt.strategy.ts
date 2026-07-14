import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

export interface JwtPayload {
  sub: string;
  email: string;
}

function extractCookieToken(
  request: Request,
  cookieName: string,
): string | null {
  const cookieHeader = request.headers.cookie;
  if (!cookieHeader) return null;

  const cookie = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${cookieName}=`));

  if (!cookie) return null;
  return decodeURIComponent(cookie.slice(cookieName.length + 1));
}

@Injectable()
// Validates the JWT on every guarded request; extracts from Authorization Bearer header
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(configService: ConfigService) {
    const cookieName = configService.get<string>(
      'AUTH_COOKIE_NAME',
      'portfolio_admin_token',
    );

    super({
      // Prefer HttpOnly cookie auth for browsers, keep Bearer support for curl/Insomnia
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => extractCookieToken(request, cookieName),
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      // Reject expired tokens before the validate() callback runs
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET')!,
    });
  }

  // Called after passport verifies the JWT signature; returned value becomes req.user
  validate(payload: JwtPayload) {
    this.logger.debug(`JWT validated for sub=${payload.sub}`);
    return { id: payload.sub, email: payload.email };
  }
}
