import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

export interface JwtPayload {
  sub: string;
  email: string;
}

@Injectable()
// Validates the JWT on every guarded request; extracts from Authorization Bearer header
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(configService: ConfigService) {
    super({
      // Only accept tokens from the Authorization: Bearer header
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
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
