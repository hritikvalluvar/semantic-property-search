
import OpenAI from "openai";

// Check if we have the API key
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.warn('Warning: OPENAI_API_KEY environment variable is not set. OpenAI embeddings will not work.');
}

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: apiKey || ''
});

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generate an embedding for the given text using OpenAI's embedding model
 * with exponential backoff retry mechanism
 */
export async function getEmbedding(text: string, maxRetries = 3): Promise<number[]> {
  let attempt = 0;
  
  while (attempt < maxRetries) {
    try {
      const response = await openai.embeddings.create({
        input: [text],
        model: 'text-embedding-ada-002'
      });
      
      return response.data[0].embedding;
    } catch (error: any) {
      attempt++;
      
      if (error.status === 429 && attempt < maxRetries) { // Rate limit error
        const delay = Math.min(1000 * Math.pow(2, attempt), 10000); // Max 10s delay
        console.log(`Rate limit hit, retrying in ${delay}ms (attempt ${attempt}/${maxRetries})`);
        await sleep(delay);
        continue;
      }
      
      console.error("Error generating embedding:", error);
      throw error;
    }
  }
  
  throw new Error(`Failed to generate embedding after ${maxRetries} attempts`);
}
