import { Pool } from 'pg';
import { createKnowledgeStore } from './knowledge-store.js';

jest.mock('pg');

describe('createKnowledgeStore', () => {
  let query: jest.Mock;

  beforeEach(() => {
    query = jest.fn().mockResolvedValue({ rows: [] });
    (Pool as unknown as jest.Mock).mockImplementation(() => ({
      query,
      end: jest.fn(),
    }));
  });

  it('ensureSchema creates the vector extension and both tables', async () => {
    const store = createKnowledgeStore({
      connectionString: 'postgres://x',
      embeddingDimensions: 768,
    });
    await store.ensureSchema();

    expect(query).toHaveBeenCalledWith('CREATE EXTENSION IF NOT EXISTS vector');
    expect(
      query.mock.calls.some(([sql]) => sql.includes('knowledge_docs')),
    ).toBe(true);
    expect(
      query.mock.calls.some(([sql]) => sql.includes('chat_feedback')),
    ).toBe(true);
  });

  it('upsertDoc serializes the embedding as a pgvector literal and casts it', async () => {
    const store = createKnowledgeStore({
      connectionString: 'postgres://x',
      embeddingDimensions: 3,
    });
    await store.upsertDoc(
      { id: 'doc-1', title: 'Title', content: 'Content' },
      [0.1, 0.2, 0.3],
    );

    expect(query).toHaveBeenCalledWith(expect.stringContaining('::vector'), [
      'doc-1',
      'Title',
      'Content',
      '[0.1,0.2,0.3]',
    ]);
  });

  it('retrieveRelevantDocs orders by cosine distance and returns similarity', async () => {
    query.mockResolvedValue({
      rows: [
        { id: 'doc-1', title: 'Title', content: 'Content', similarity: 0.92 },
      ],
    });
    const store = createKnowledgeStore({
      connectionString: 'postgres://x',
      embeddingDimensions: 3,
    });

    const docs = await store.retrieveRelevantDocs([0.1, 0.2, 0.3], 3);

    expect(docs).toEqual([
      { id: 'doc-1', title: 'Title', content: 'Content', similarity: 0.92 },
    ]);
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('ORDER BY embedding <=>'),
      ['[0.1,0.2,0.3]', 3],
    );
  });

  it('recordFeedback inserts the rating with a nullable quoteId', async () => {
    const store = createKnowledgeStore({
      connectionString: 'postgres://x',
      embeddingDimensions: 3,
    });
    await store.recordFeedback({
      quoteId: null,
      messageText: 'Thanks!',
      rating: 'up',
    });

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO chat_feedback'),
      [null, 'Thanks!', 'up'],
    );
  });
});
