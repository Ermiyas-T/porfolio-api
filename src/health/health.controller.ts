import { Controller, Get, Res, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import type { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Health')
@Controller()
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Liveness probe.
   * Confirms the process is running and responsive.
   * Excludes downstream dependencies by design, per standard
   * liveness/readiness separation.
   */
  @ApiOperation({ summary: 'Liveness probe' })
  @ApiResponse({
    status: 200,
    description: 'Process is running',
    schema: {
      example: {
        status: 'ok',
        timestamp: '2026-08-15T14:00:00.000Z',
        uptime: 123.45,
      },
    },
  })
  @Get(['', 'health'])
  check(@Res() res: Response) {
    return res.status(HttpStatus.OK).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  }

  /**
   * Readiness probe.
   * Verifies connectivity to the primary datastore dependency.
   */
  @ApiOperation({ summary: 'Readiness probe — verifies database connectivity' })
  @ApiResponse({
    status: 200,
    description: 'Service and dependencies are healthy',
    schema: {
      example: {
        status: 'ok',
        timestamp: '2026-08-15T14:00:00.000Z',
        database: { status: 'up', latencyMs: 15 },
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: 'Dependency check failed',
    schema: {
      example: {
        status: 'error',
        timestamp: '2026-08-15T14:00:00.000Z',
        database: { status: 'down', error: 'Database query failed' },
      },
    },
  })
  @Get('health/db')
  async checkDb(@Res() res: Response) {
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
      dbError =
        err instanceof Error ? err.message : 'Database connection error';
    }

    const isHealthy = dbStatus === 'up';

    return res
      .status(isHealthy ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE)
      .json({
        status: isHealthy ? 'ok' : 'error',
        timestamp: new Date().toISOString(),
        database: {
          status: dbStatus,
          ...(latencyMs !== undefined && { latencyMs }),
          ...(dbError && { error: dbError }),
        },
      });
  }
}
