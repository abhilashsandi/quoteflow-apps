import { Injectable } from '@nestjs/common';
import {
  createRatingServiceClient,
  type RatingServiceClient,
} from 'api-client';
import { env } from '../env.js';

/**
 * bff-gateway has no direct Postgres connection for quote data — every quote read/write is a
 * proxied call to quoteflow-rating-service through this client. See the top-level README for
 * why: the two repos talk only over HTTP, never a shared database connection.
 */
@Injectable()
export class RatingServiceClientService {
  readonly client: RatingServiceClient = createRatingServiceClient(
    env.RATING_SERVICE_URL,
    {
      Origin: env.SELF_ORIGIN,
    },
  );
}
