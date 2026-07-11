import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ConfigService } from '@nestjs/config';

@Injectable()
// Wraps PrismaClient to integrate with NestJS lifecycle — connect on module init
export class PrismaService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(PrismaService.name);

  constructor(private readonly configService: ConfigService) {
    // Prisma 7: URL is passed via the config file (prisma.config.ts),
    // PrismaClient itself reads DATABASE_URL from env at runtime
    super();
  }

  async onModuleInit(): Promise<void> {
    // Connect eagerly so startup fails fast on a bad DATABASE_URL rather than on the first query
    await this.$connect();
    this.logger.log('Database connected');
  }
}
