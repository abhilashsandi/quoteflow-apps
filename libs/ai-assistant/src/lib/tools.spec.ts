import { GET_QUOTE_SUMMARY_TOOL } from './tools.js';

describe('GET_QUOTE_SUMMARY_TOOL', () => {
  it('requires a quoteId parameter', () => {
    expect(GET_QUOTE_SUMMARY_TOOL.name).toBe('get_quote_summary');
    expect(GET_QUOTE_SUMMARY_TOOL.parametersJsonSchema).toMatchObject({
      type: 'object',
      required: ['quoteId'],
    });
  });
});
