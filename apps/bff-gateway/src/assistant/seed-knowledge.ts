import {
  COVERAGE_DOCS,
  createGeminiClient,
  createKnowledgeStore,
} from 'ai-assistant';
import { env } from '../env.js';

/**
 * One-off script: embeds every static coverage doc (RETRIEVAL_DOCUMENT task type — Gemini's
 * embedding model produces different vectors for indexing vs. querying, see
 * gemini-client.ts) and upserts it into the assistant's pgvector table. Safe to re-run —
 * upsertDoc is keyed by the doc's id.
 */
async function main(): Promise<void> {
  const gemini = createGeminiClient({
    apiKey: env.GEMINI_API_KEY,
    chatModel: env.GEMINI_CHAT_MODEL,
    embeddingModel: env.GEMINI_EMBEDDING_MODEL,
    embeddingDimensions: env.GEMINI_EMBEDDING_DIMENSIONS,
  });
  const knowledgeStore = createKnowledgeStore({
    connectionString: env.ASSISTANT_DATABASE_URL,
    embeddingDimensions: env.GEMINI_EMBEDDING_DIMENSIONS,
  });

  await knowledgeStore.ensureSchema();

  for (const doc of COVERAGE_DOCS) {
    const embedding = await gemini.embedText(doc.content, 'RETRIEVAL_DOCUMENT');
    await knowledgeStore.upsertDoc(doc, embedding);
    console.log(`Seeded: ${doc.title}`);
  }

  await knowledgeStore.close();
  console.log(`Done — ${COVERAGE_DOCS.length} document(s) seeded.`);
}

main().catch((err: unknown) => {
  console.error('Failed to seed the assistant knowledge base:', err);
  process.exit(1);
});
