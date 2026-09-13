import { Pool } from 'pg';
import type { KnowledgeDoc, RetrievedDoc } from './types.js';

export interface KnowledgeStoreOptions {
  connectionString: string;
  /** Must match the embedding model's actual output size (see gemini-client.ts's
   * embeddingDimensions) — pgvector's column type is fixed-width. */
  embeddingDimensions: number;
}

export interface KnowledgeStore {
  ensureSchema(): Promise<void>;
  upsertDoc(doc: KnowledgeDoc, embedding: number[]): Promise<void>;
  retrieveRelevantDocs(
    queryEmbedding: number[],
    limit: number,
  ): Promise<RetrievedDoc[]>;
  recordFeedback(feedback: {
    quoteId: string | null;
    messageText: string;
    rating: 'up' | 'down';
  }): Promise<void>;
  close(): Promise<void>;
}

/** pgvector wants its vector literal as a string like "[0.1,0.2,...]", cast to ::vector in
 * SQL — passing a plain array through node-postgres would just serialize as a Postgres array
 * literal instead, which pgvector doesn't accept. */
function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(',')}]`;
}

export function createKnowledgeStore(
  options: KnowledgeStoreOptions,
): KnowledgeStore {
  const pool = new Pool({ connectionString: options.connectionString });

  async function ensureSchema(): Promise<void> {
    await pool.query('CREATE EXTENSION IF NOT EXISTS vector');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS knowledge_docs (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        embedding vector(${options.embeddingDimensions}) NOT NULL
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS chat_feedback (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        quote_id TEXT,
        message_text TEXT NOT NULL,
        rating TEXT NOT NULL CHECK (rating IN ('up', 'down')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
  }

  async function upsertDoc(
    doc: KnowledgeDoc,
    embedding: number[],
  ): Promise<void> {
    await pool.query(
      `INSERT INTO knowledge_docs (id, title, content, embedding)
       VALUES ($1, $2, $3, $4::vector)
       ON CONFLICT (id) DO UPDATE SET title = $2, content = $3, embedding = $4::vector`,
      [doc.id, doc.title, doc.content, toVectorLiteral(embedding)],
    );
  }

  async function retrieveRelevantDocs(
    queryEmbedding: number[],
    limit: number,
  ): Promise<RetrievedDoc[]> {
    // <=> is pgvector's cosine distance operator (0 = identical); similarity is 1 - distance
    // so callers get the more intuitive "higher is better" number.
    const result = await pool.query<{
      id: string;
      title: string;
      content: string;
      similarity: number;
    }>(
      `SELECT id, title, content, 1 - (embedding <=> $1::vector) AS similarity
       FROM knowledge_docs
       ORDER BY embedding <=> $1::vector
       LIMIT $2`,
      [toVectorLiteral(queryEmbedding), limit],
    );
    return result.rows;
  }

  async function recordFeedback(feedback: {
    quoteId: string | null;
    messageText: string;
    rating: 'up' | 'down';
  }): Promise<void> {
    await pool.query(
      `INSERT INTO chat_feedback (quote_id, message_text, rating) VALUES ($1, $2, $3)`,
      [feedback.quoteId, feedback.messageText, feedback.rating],
    );
  }

  async function close(): Promise<void> {
    await pool.end();
  }

  return {
    ensureSchema,
    upsertDoc,
    retrieveRelevantDocs,
    recordFeedback,
    close,
  };
}
