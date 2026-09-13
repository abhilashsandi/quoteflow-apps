import { Injectable } from '@nestjs/common';
import {
  createFeatureFlagClient,
  createLocalFileProvider,
  type FeatureFlagClient,
} from 'feature-flags';
import { resolve } from 'node:path';
import { env } from '../env.js';

@Injectable()
export class FeatureFlagsService {
  readonly client: FeatureFlagClient = createFeatureFlagClient(
    createLocalFileProvider(resolve(process.cwd(), env.FEATURE_FLAGS_FILE)),
  );
}
