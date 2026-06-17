import { Module } from '@nestjs/common';
import { HealthController } from './health/health.controller';
import { MemoriesController } from './memories/memories.controller';
import { MetricsController } from './metrics/metrics.controller';
import { UsersController } from './users/users.controller';
import { buildProviders } from './providers';

@Module({
  controllers: [MemoriesController, UsersController, HealthController, MetricsController],
  providers: [...buildProviders()],
})
export class AppModule {}
