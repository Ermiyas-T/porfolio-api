import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
// Wraps PrismaClient to integrate with NestJS lifecycle — connect on module init
export class PrismaService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(PrismaService.name);

  constructor(configService: ConfigService) {
    // Prisma 7 requires a driver adapter to be passed in the constructor
    const adapter = new PrismaPg({ connectionString: configService.get<string>('DATABASE_URL') });
    super({ adapter });
  }

  async onModuleInit(): Promise<void> {
    // Connect eagerly so startup fails fast on a bad DATABASE_URL rather than on the first query
    await this.$connect();
    this.logger.log('Database connected');
  }
}
