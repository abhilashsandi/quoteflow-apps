import type { ToolDefinition } from './types.js';

/**
 * The one tool this sample wires end-to-end. Lets the assistant answer "what's my current
 * premium?" or "what's my policy status?" with live data instead of only whatever was in the
 * chat's static context — the point being to demonstrate a real function-calling round trip,
 * not to build out a full tool catalog.
 */
export const GET_QUOTE_SUMMARY_TOOL: ToolDefinition = {
  name: 'get_quote_summary',
  description:
    "Fetches the current status, funnel stage, and rated premium for the customer's in-progress quote. Use this whenever the user asks about their price, coverage status, or where they are in the quote process.",
  parametersJsonSchema: {
    type: 'object',
    properties: {
      quoteId: {
        type: 'string',
        description:
          "The quote's id. Use the one already given in context if present.",
      },
    },
    required: ['quoteId'],
  },
};
