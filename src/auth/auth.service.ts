import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto): Promise<{ accessToken: string }> {
    const user = await this.prisma.adminUser.findUnique({
      where: { email: dto.email },
    });

    // Use generic message to avoid leaking whether the email exists
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // bcrypt.compare is timing-safe — resist timing attacks on password comparison
    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    this.logger.log(`Admin login: ${user.email}`);
    // Minimal payload — only include the ID, keep the JWT small and non-sensitive
    const payload = { sub: user.id, email: user.email };
    return { accessToken: this.jwtService.sign(payload) };
  }
}
