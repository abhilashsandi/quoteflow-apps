import { HttpException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { QuotesController } from './quotes.controller.js';
import { RatingServiceClientService } from './rating-service-client.service.js';

describe('QuotesController', () => {
  let controller: QuotesController;
  let client: {
    createQuote: jest.Mock;
    getQuoteSchema: jest.Mock;
    patchQuote: jest.Mock;
    pullReport: jest.Mock;
  };

  beforeEach(async () => {
    client = {
      createQuote: jest.fn(),
      getQuoteSchema: jest.fn(),
      patchQuote: jest.fn(),
      pullReport: jest.fn(),
    };
    const moduleRef = await Test.createTestingModule({
      controllers: [QuotesController],
      providers: [
        { provide: RatingServiceClientService, useValue: { client } },
      ],
    }).compile();
    controller = moduleRef.get(QuotesController);
  });

  it('createQuote proxies to the rating service and unwraps a successful Result', async () => {
    client.createQuote.mockResolvedValue({
      success: true,
      data: {
        quoteId: 'q1',
        funnelStage: 'schema',
        currentPageKey: 'driver-info',
      },
    });
    const result = await controller.createQuote('acme');
    expect(client.createQuote).toHaveBeenCalledWith('acme');
    expect(result).toEqual({
      quoteId: 'q1',
      funnelStage: 'schema',
      currentPageKey: 'driver-info',
    });
  });

  it('createQuote surfaces the upstream error as an HttpException instead of swallowing it', async () => {
    client.createQuote.mockResolvedValue({
      success: false,
      error: {
        status: 404,
        code: 'carrier_not_found',
        details: { carrierCode: 'nope' },
      },
    });
    await expect(controller.createQuote('nope')).rejects.toBeInstanceOf(
      HttpException,
    );
  });

  it('patchQuote forwards the JSON Patch body and quoteId to the rating service', async () => {
    client.patchQuote.mockResolvedValue({
      success: true,
      data: {
        quoteId: 'q1',
        funnelStage: 'rc1',
        answers: {},
        rate: { premium: 600, currency: 'USD', ratedAt: 'now' },
      },
    });
    const ops = [
      { op: 'add' as const, path: '/driver-info/firstName', value: 'Jane' },
    ];
    await controller.patchQuote('q1', ops);
    expect(client.patchQuote).toHaveBeenCalledWith('q1', ops);
  });
});
