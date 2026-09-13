process.env.RATING_SERVICE_URL ??= 'http://localhost:4000';
process.env.GEMINI_API_KEY ??= 'test-gemini-api-key';
process.env.ASSISTANT_DATABASE_URL ??=
  'postgres://postgres:quoteflow@localhost:5433/quoteflow_assistant_test';
process.env.NODE_ENV = 'test';
