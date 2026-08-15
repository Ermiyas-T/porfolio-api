import { Controller, Get, Res, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import type { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Health')
@Controller()
export class HealthController {
  constructor(private readonly prisma: PrismaService) { }

  @ApiOperation({ summary: 'Check API and database health status' })
  @ApiResponse({
    status: 200,
    description: 'Service and database are healthy',
    schema: {
      example: {
        status: 'ok',
        timestamp: '2026-08-15T14:00:00.000Z',
        uptime: 123.45,
        database: {
          status: 'up',
          latencyMs: 15,
        },
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: 'Service or database is unhealthy',
    schema: {
      example: {
        status: 'error',
        timestamp: '2026-08-15T14:00:00.000Z',
        uptime: 123.45,
        database: {
          status: 'down',
          error: 'Database query failed',
        },
      },
    },
  })
  @Get(['', 'health'])
  async check(@Res() res: Response) {
    const startTime = Date.now();
    let dbStatus: 'up' | 'down' = 'down';
    let latencyMs: number | undefined;
    let dbError: string | undefined;

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      dbStatus = 'up';
      latencyMs = Date.now() - startTime;
    } catch (err) {
      dbStatus = 'down';
      dbError = err instanceof Error ? err.message : 'Database connection error';
    }

    const isHealthy = dbStatus === 'up';

    const responseBody = {
      status: isHealthy ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: {
        status: dbStatus,
        ...(latencyMs !== undefined && { latencyMs }),
        ...(dbError && { error: dbError }),
      },
    };

    return res
      .status(isHealthy ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE)
      .json(responseBody);
  }
}
