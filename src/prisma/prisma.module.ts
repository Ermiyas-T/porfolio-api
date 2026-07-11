import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

// Global so PrismaService is available across all feature modules without re-importing
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
