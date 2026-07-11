import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Named guard wrapping passport-jwt strategy; used on every admin/mutating route
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
