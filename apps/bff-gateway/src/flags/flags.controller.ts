import { Controller, Get } from '@nestjs/common';
import { FeatureFlagsService } from './feature-flags.service.js';

/**
 * The one flag this sample wires end-to-end: whether customer-portal's landing page shows a
 * "Save 15%" badge on the Auto option card. A real product would list many keys here; one is
 * enough to prove the local-file provider -> bff-gateway -> Next server component path works.
 */
@Controller('flags')
export class FlagsController {
  constructor(private readonly featureFlags: FeatureFlagsService) {}

  @Get()
  async getFlags(): Promise<{ showSavingsBadge: boolean }> {
    return {
      showSavingsBadge: await this.featureFlags.client.getBooleanValue(
        'customer-portal.show-savings-badge',
        false,
      ),
    };
  }
}
