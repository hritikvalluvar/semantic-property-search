import express, { type Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { getEmbedding } from "./services/openai";
import { searchVectors } from "./services/pinecone";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // API routes for property search
  const apiRouter = express.Router();
  
  // Initialize data
  await storage.loadPropertyDataFromCSV();
  
  // Get filter options
  apiRouter.get("/property/filters", async (req: Request, res: Response) => {
    try {
      const filterOptions = await storage.getFilterOptions();
      res.json(filterOptions);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Search properties with embeddings
  apiRouter.post("/property/search", async (req: Request, res: Response) => {
    try {
      // Check for API keys
      if (!process.env.OPENAI_API_KEY) {
        return res.status(503).json({ 
          message: "OpenAI API key is missing. Please set the OPENAI_API_KEY environment variable.",
          missingKey: "OPENAI_API_KEY" 
        });
      }
      
      if (!process.env.PINECONE_API_KEY) {
        return res.status(503).json({ 
          message: "Pinecone API key is missing. Please set the PINECONE_API_KEY environment variable.",
          missingKey: "PINECONE_API_KEY" 
        });
      }

      const searchSchema = z.object({
        query: z.string().min(1),
      });
      
      const validatedData = searchSchema.parse(req.body);
      const { query } = validatedData;

      try {
        // Generate embedding for query
        const queryEmbedding = await getEmbedding(query);
        
        // Search Pinecone
        const searchResults = await searchVectors(queryEmbedding);
        
        // Get full property details
        const properties = await storage.getPropertiesByIds(searchResults.map(r => r.id));
        
        // Combine search results with property data
        const results = searchResults.map(result => {
          const property = properties.find(p => p.id.toString() === result.id);
          return {
            ...property,
            score: result.score
          };
        }).filter(item => item.id !== undefined);
        
        res.json(results);
      } catch (error: any) {
        // Handle specific API errors
        const errorMessage = error.message || "";
        
        if (errorMessage.includes('API key') || errorMessage.includes('invalid_api_key')) {
          if (errorMessage.toLowerCase().includes('openai')) {
            return res.status(503).json({ 
              message: "There was an issue with the OpenAI API key. Please check your API key is valid.",
              missingKey: "OPENAI_API_KEY"
            });
          }
          
          if (errorMessage.toLowerCase().includes('pinecone')) {
            return res.status(503).json({ 
              message: "There was an issue with the Pinecone API. Please check your API key is valid.",
              missingKey: "PINECONE_API_KEY"
            });
          }
        }
        
        // Re-throw for general error handling
        throw error;
      }
    } catch (error: any) {
      console.error("Search error:", error);
      res.status(500).json({ 
        message: "An error occurred during search. Please try again later.",
        error: error.message
      });
    }
  });
  
  // Use the API router with prefix
  app.use("/api", apiRouter);

  const httpServer = createServer(app);
  return httpServer;
}
