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

/**
 * Generate an embedding for the given text using OpenAI's embedding model
 */
export async function getEmbedding(text: string): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      input: [text],
      model: 'text-embedding-ada-002'
    });
    
    return response.data[0].embedding;
  } catch (error) {
    console.error("Error generating embedding:", error);
    throw error;
  }
}
