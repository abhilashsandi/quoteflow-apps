import { Module } from '@nestjs/common';
import { FeatureFlagsService } from './feature-flags.service.js';
import { FlagsController } from './flags.controller.js';

@Module({
  controllers: [FlagsController],
  providers: [FeatureFlagsService],
})
export class FlagsModule {}
