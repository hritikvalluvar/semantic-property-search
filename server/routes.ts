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
      const searchSchema = z.object({
        query: z.string().min(1),
      });
      
      const validatedData = searchSchema.parse(req.body);
      const { query } = validatedData;
      
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
      console.error("Search error:", error);
      res.status(400).json({ message: error.message });
    }
  });
  
  // Use the API router with prefix
  app.use("/api", apiRouter);

  const httpServer = createServer(app);
  return httpServer;
}
