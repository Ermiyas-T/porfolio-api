import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(PrismaService.name);

  constructor(configService: ConfigService) {
    const pool = new Pool({
      connectionString: configService.get<string>('DATABASE_URL'),
      // keep connections alive — Neon free tier pauses after 5min idle
      idleTimeoutMillis: 30_000,
      // give Neon time to wake from sleep (free tier cold-start)
      connectionTimeoutMillis: 15_000,
      max: 2,
      allowExitOnIdle: false,
    });

    // log and recover from pool errors — prevents crash on transient failures
    pool.on('error', (err) => {
      this.logger.error(`Database pool error: ${err.message}`);
    });

    const adapter = new PrismaPg(pool);
    super({ adapter });
  }

  async onModuleInit(): Promise<void> {
    await this.connectWithRetry();
    this.logger.log('Database connected');
  }

  // Retry connection on startup to handle Neon cold-start delays
  private async connectWithRetry(attempt = 1): Promise<void> {
    try {
      await this.$connect();
    } catch (err) {
      if (attempt < MAX_RETRIES) {
        this.logger.warn(
          `Database connection attempt ${attempt} failed, retrying in ${RETRY_DELAY_MS}ms...`,
        );
        await delay(RETRY_DELAY_MS);
        return this.connectWithRetry(attempt + 1);
      }
      this.logger.error('All database connection attempts failed');
      throw err;
    }
  }
}
