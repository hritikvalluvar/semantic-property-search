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
        // Extract specific attributes from the query
        const bedroomMatch = query.match(/(\d+)[\s-]bed/i);
        const bathroomMatch = query.match(/(\d+)[\s-]bath/i);
        const specificAttributes: Record<string, any> = {};
        
        if (bedroomMatch) {
          specificAttributes.bedrooms = parseInt(bedroomMatch[1]);
        }
        
        if (bathroomMatch) {
          specificAttributes.bathrooms = parseInt(bathroomMatch[1]);
        }
        
        // Type matching
        const typeMatches: string[] = [];
        ['House', 'Flat', 'Apartment', 'Studio', 'Cottage', 'Bungalow', 'Penthouse', 'Townhouse'].forEach(type => {
          if (query.toLowerCase().includes(type.toLowerCase())) {
            typeMatches.push(type);
          }
        });
        
        if (typeMatches.length > 0) {
          specificAttributes.type = typeMatches;
        }
        
        // Generate embedding for query
        const queryEmbedding = await getEmbedding(query);
        
        // Search Pinecone
        const searchResults = await searchVectors(queryEmbedding, 50); // Increase to get more candidates
        
        // Get full property details
        const properties = await storage.getPropertiesByIds(searchResults.map(r => r.id));
        
        // Combine search results with property data and apply attribute filters
        let results = searchResults.map(result => {
          const property = properties.find(p => p.id.toString() === result.id);
          if (!property) return null;
          
          return {
            ...property,
            score: result.score
          };
        }).filter(item => item !== null) as any[];
        
        // Apply exact attribute matching and boost scores for matches
        if (Object.keys(specificAttributes).length > 0) {
          results = results.map(result => {
            let matchBoost = 0;
            let isExactMatch = true;
            
            // Check each specific attribute
            for (const [attr, value] of Object.entries(specificAttributes)) {
              if (attr === 'type' && Array.isArray(value)) {
                // For type, check if any of the specified types match
                const typeMatch = value.some(type => result.type === type);
                if (typeMatch) {
                  matchBoost += 0.2; // Boost score for type match
                } else {
                  isExactMatch = false;
                }
              } else if (result[attr] === value) {
                matchBoost += 0.3; // Boost score for exact match (bedrooms, bathrooms)
              } else {
                isExactMatch = false;
              }
            }
            
            // Apply boost to exact matches
            if (isExactMatch) {
              matchBoost += 0.5;
            }
            
            return {
              ...result,
              score: result.score + matchBoost, // Boost score
              exactMatch: isExactMatch
            };
          });
          
          // If we have exact matches, prioritize them
          const exactMatches = results.filter(r => r.exactMatch);
          if (exactMatches.length > 0) {
            results = [...exactMatches, ...results.filter(r => !r.exactMatch)];
          }
        }
        
        // Sort by score
        results.sort((a, b) => b.score - a.score);
        
        // Normalize scores to 0-100 range
        const topResults = results.slice(0, 20);
        if (topResults.length > 0) {
          // Find max and min scores
          const maxScore = Math.max(...topResults.map(r => r.score));
          const minScore = Math.min(...topResults.map(r => r.score));
          const scoreRange = maxScore - minScore;
          
          // Normalize scores
          if (scoreRange > 0) {
            topResults.forEach(result => {
              // Convert to 0-100 scale and round to 2 decimal places
              result.score = Math.min(100, Math.max(0, 
                Math.round(((result.score - minScore) / scoreRange) * 100 * 100) / 100
              ));
            });
          } else {
            // If all scores are the same
            topResults.forEach(result => {
              result.score = 100;
            });
          }
        }
        
        // Return top 20 results with normalized scores
        res.json(topResults);
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
