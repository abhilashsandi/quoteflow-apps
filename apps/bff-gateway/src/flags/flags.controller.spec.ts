import { Test } from '@nestjs/testing';
import { FeatureFlagsService } from './feature-flags.service.js';
import { FlagsController } from './flags.controller.js';

describe('FlagsController', () => {
  let controller: FlagsController;
  let getBooleanValue: jest.Mock;

  beforeEach(async () => {
    getBooleanValue = jest.fn();
    const moduleRef = await Test.createTestingModule({
      controllers: [FlagsController],
      providers: [
        {
          provide: FeatureFlagsService,
          useValue: { client: { getBooleanValue } },
        },
      ],
    }).compile();
    controller = moduleRef.get(FlagsController);
  });

  it('resolves showSavingsBadge from the feature-flag client', async () => {
    getBooleanValue.mockResolvedValue(true);
    const result = await controller.getFlags();
    expect(getBooleanValue).toHaveBeenCalledWith(
      'customer-portal.show-savings-badge',
      false,
    );
    expect(result).toEqual({ showSavingsBadge: true });
  });

  it('reflects a false-resolved flag', async () => {
    getBooleanValue.mockResolvedValue(false);
    const result = await controller.getFlags();
    expect(result).toEqual({ showSavingsBadge: false });
  });
});
