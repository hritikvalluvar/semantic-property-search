import { Pinecone } from "@pinecone-database/pinecone";

// Simple script to check the structure of the Pinecone package
async function main() {
  const pc = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY || ''
  });
  
  console.log("Pinecone API structure:");
  console.dir(pc);
  
  // Check index structure
  try {
    const index = pc.Index("test-index");
    console.log("Index structure:");
    console.dir(index);
    console.log("Index methods:", Object.getOwnPropertyNames(Object.getPrototypeOf(index)));
    
    // Check expected method signatures
    console.log("Upsert signature:", index.upsert);
    console.log("Query signature:", index.query);
  } catch (error) {
    console.error("Error:", error);
  }
}

main().catch(console.error);