import { Pinecone } from "@pinecone-database/pinecone";
import { PropertyEmbedding } from "@shared/schema";

// Check for API key
const apiKey = process.env.PINECONE_API_KEY;
if (!apiKey) {
  console.warn('Warning: PINECONE_API_KEY environment variable is not set. Pinecone vector search will not work.');
}

// Initialize Pinecone client
const pc = new Pinecone({
  apiKey: apiKey || ''
});

// Get index name from environment or use default
const INDEX_NAME = process.env.PINECONE_INDEX_NAME || 'property-listings-index';
const index = pc.Index(INDEX_NAME);

interface PineconeSearchResult {
  id: string;
  score: number;
}

/**
 * Upsert vectors into Pinecone index
 */
export async function upsertVectors(vectors: PropertyEmbedding[]): Promise<void> {
  try {
    // Batch upsert in chunks to avoid max payload size issues
    const BATCH_SIZE = 100;
    for (let i = 0; i < vectors.length; i += BATCH_SIZE) {
      const batch = vectors.slice(i, i + BATCH_SIZE);
      
      // Format records according to Pinecone's SDK format
      const records = batch.map(v => ({
        id: v.id,
        values: v.embedding
      }));
      
      // Call upsert directly with the records array
      await index.upsert(records);
    }
  } catch (error) {
    console.error("Error upserting vectors:", error);
    throw error;
  }
}

/**
 * Search vectors in Pinecone index
 */
export async function searchVectors(queryEmbedding: number[], topK: number = 20): Promise<PineconeSearchResult[]> {
  try {
    const result = await index.query({
      vector: queryEmbedding,
      topK,
      includeMetadata: false
    });
    
    // Ensure we handle undefined scores (which shouldn't happen but TypeScript is concerned)
    return result.matches.map(match => ({
      id: match.id,
      score: typeof match.score === 'number' ? match.score : 0
    }));
  } catch (error) {
    console.error("Error searching vectors:", error);
    throw error;
  }
}
