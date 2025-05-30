import express, { type Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { getEmbedding } from "./services/openai";
import { searchVectors } from "./services/pinecone";
import { generatePropertyImage, getExistingPropertyImage } from "./services/image-generation";
import { z } from "zod";
import { type Property } from "@shared/schema";
import { calculateDistance, calculateProximityBoost, parseLocationQuery } from './services/geocoding';

export async function registerRoutes(app: Express): Promise<Server> {
  // API routes for property search
  const apiRouter = express.Router();
  
  // Create HTTP server first so it can start accepting connections quickly and pass health checks
  const server = createServer(app);
  
  // Initialize data in the background without blocking server startup
  // This allows the server to respond to health checks immediately
  setTimeout(async () => {
    try {
      await storage.loadPropertyDataFromCSV();
      console.log("CSV data loaded successfully");
    } catch (error) {
      console.error("Error loading CSV data:", error);
    }
  }, 100);
  
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
        // Use the already imported geocoding utilities from the top of the file
        
        // Extract specific attributes from the query
        const bedroomMatch = query.match(/(\d+)[\s-]bed/i);
        const bathroomMatch = query.match(/(\d+)[\s-]bath/i);
        const specificAttributes: Record<string, any> = {};
        const priceRanges: {min?: number, max?: number, target?: number} = {};
        
        // Extract location proximity information
        const locationQuery = parseLocationQuery(query);
        let targetLocation = null;
        if (locationQuery) {
          // Import the getCoordinates function from the geocoding service
          const { getCoordinates } = await import('./services/geocoding');
          targetLocation = {
            name: locationQuery,
            coordinates: getCoordinates(locationQuery)
          };
          specificAttributes.targetLocation = targetLocation;
        }
        
        // Extract bedrooms
        if (bedroomMatch) {
          specificAttributes.bedrooms = parseInt(bedroomMatch[1]);
        }
        
        // Extract bathrooms
        if (bathroomMatch) {
          specificAttributes.bathrooms = parseInt(bathroomMatch[1]);
        }
        
        // Advanced price matching (handles various formats and phrases)
        // Match explicit price values with or without symbols (£500k, 500k, 500,000, £500,000, etc.)
        const priceExactMatches = query.match(/(?:£|\$|€)?(\d[\d,]*(?:\.\d+)?)\s*(?:k|thousand|m|million)?/gi);
        
        // Match price range phrases
        const underPriceMatch = query.match(/(?:under|below|less than|cheaper than|max|maximum)(?:\s+of)?\s+(?:£|\$|€)?(\d[\d,]*(?:\.\d+)?)\s*(?:k|thousand|m|million)?/i);
        const overPriceMatch = query.match(/(?:over|above|more than|at least|min|minimum)(?:\s+of)?\s+(?:£|\$|€)?(\d[\d,]*(?:\.\d+)?)\s*(?:k|thousand|m|million)?/i);
        const aroundPriceMatch = query.match(/(?:around|about|approximately|close to|near)(?:\s+a)?(?:\s+price(?:\s+of)?)?\s+(?:£|\$|€)?(\d[\d,]*(?:\.\d+)?)\s*(?:k|thousand|m|million)?/i);
        
        // Process price matches
        if (underPriceMatch) {
          const priceStr = underPriceMatch[1].replace(/,/g, '');
          let price = parseFloat(priceStr);
          // Handle k/thousand and m/million suffixes
          if (underPriceMatch[0].toLowerCase().includes('k') || underPriceMatch[0].toLowerCase().includes('thousand')) {
            price *= 1000;
          } else if (underPriceMatch[0].toLowerCase().includes('m') || underPriceMatch[0].toLowerCase().includes('million')) {
            price *= 1000000;
          }
          priceRanges.max = price;
        }
        
        if (overPriceMatch) {
          const priceStr = overPriceMatch[1].replace(/,/g, '');
          let price = parseFloat(priceStr);
          // Handle k/thousand and m/million suffixes
          if (overPriceMatch[0].toLowerCase().includes('k') || overPriceMatch[0].toLowerCase().includes('thousand')) {
            price *= 1000;
          } else if (overPriceMatch[0].toLowerCase().includes('m') || overPriceMatch[0].toLowerCase().includes('million')) {
            price *= 1000000;
          }
          priceRanges.min = price;
        }
        
        if (aroundPriceMatch) {
          const priceStr = aroundPriceMatch[1].replace(/,/g, '');
          let price = parseFloat(priceStr);
          // Handle k/thousand and m/million suffixes
          if (aroundPriceMatch[0].toLowerCase().includes('k') || aroundPriceMatch[0].toLowerCase().includes('thousand')) {
            price *= 1000;
          } else if (aroundPriceMatch[0].toLowerCase().includes('m') || aroundPriceMatch[0].toLowerCase().includes('million')) {
            price *= 1000000;
          }
          priceRanges.target = price;
          
          // For "around" queries, set a range of +/- 20%
          const range = price * 0.2;
          priceRanges.min = price - range;
          priceRanges.max = price + range;
        }
        
        // If we found at least one price range constraint, save it
        if (Object.keys(priceRanges).length > 0) {
          specificAttributes.priceRanges = priceRanges;
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
        
        let queryEmbedding;
        let searchResults: { id: string; score: number }[] = [];
        
        try {
          // Generate embedding for query
          queryEmbedding = await getEmbedding(query);
          
          // Search Pinecone
          searchResults = await searchVectors(queryEmbedding, 50); // Increase to get more candidates
        } catch (error: any) {
          console.error("Search error:", error);
          
          // If we hit a rate limit or other API error, fall back to basic search
          if (error.status === 429 || !queryEmbedding) {
            console.log("Falling back to basic search due to API limits");
            console.log("Query: ", query);
            // We'll skip the vector search but still apply filters below
            searchResults = [];
          } else {
            // For other errors, return the error to the client
            return res.status(500).json({ 
              message: "An error occurred during search",
              error: error.message
            });
          }
        }
        
        let properties = [];
        
        if (searchResults.length > 0) {
          // Get full property details from search results
          properties = await storage.getPropertiesByIds(searchResults.map(r => r.id));
          console.log(`Got ${properties.length} properties from search results`);
        } else {
          // Fallback: Get all properties when we can't use vector search
          // We'll filter these based on text query and attributes later
          properties = await storage.getAllProperties();
          console.log(`Fallback: Got ${properties.length} properties from getAllProperties`);
        }
        
        // Combine search results with property data and apply attribute filters
        let results: any[] = [];
        
        if (searchResults.length > 0) {
          // If we have search results from vector search, use those
          results = searchResults.map(result => {
            const property = properties.find((p: Property) => p.id.toString() === result.id);
            if (!property) return null;
            
            return {
              ...property,
              score: result.score
            };
          }).filter(item => item !== null) as any[];
        } else {
          // If we're using fallback search mode, convert all properties to results
          // We'll assign base scores for now and rerank them below
          results = properties.map((property: Property) => ({
            ...property,
            score: 0.5 // Default middle score, will be adjusted based on matches
          }));
          
          // Apply basic text search if there's a query
          if (query.trim()) {
            const normalizedQuery = query.toLowerCase();
            
            // Enhanced text matching for fallback mode with scoring
            results = results.filter(property => {
              // Check if property matches any part of the query
              const titleMatch = property.title.toLowerCase().includes(normalizedQuery);
              const descMatch = property.description.toLowerCase().includes(normalizedQuery);
              const locationMatch = property.location.toLowerCase().includes(normalizedQuery);
              const typeMatch = property.type.toLowerCase().includes(normalizedQuery);
              const styleMatch = property.style.toLowerCase().includes(normalizedQuery);
              const viewMatch = property.view.toLowerCase().includes(normalizedQuery);
              const furnishingMatch = property.furnishing.toLowerCase().includes(normalizedQuery);
              
              // Check for individual terms in query (like "modern penthouse river")
              const queryTerms = normalizedQuery.split(/\s+/);
              const termMatches = queryTerms.filter(term => 
                property.title.toLowerCase().includes(term) ||
                property.description.toLowerCase().includes(term) ||
                property.location.toLowerCase().includes(term) ||
                property.type.toLowerCase().includes(term) ||
                property.style.toLowerCase().includes(term) ||
                property.view.toLowerCase().includes(term) ||
                property.furnishing.toLowerCase().includes(term)
              );
              
              // Set score based on how well it matches
              if (titleMatch) property.score += 0.25;
              if (typeMatch) property.score += 0.20;
              if (styleMatch) property.score += 0.15;
              if (viewMatch) property.score += 0.15;
              if (locationMatch) property.score += 0.10;
              if (furnishingMatch) property.score += 0.10;
              if (descMatch) property.score += 0.05;
              
              // Bonus for matching multiple terms
              if (termMatches.length > 0) {
                property.score += 0.1 * (termMatches.length / queryTerms.length);
              }
              
              // For keyword matches (complete words only), boost the score further
              queryTerms.forEach(term => {
                if (term.length <= 3) return; // Skip short words
                
                const termRegex = new RegExp(`\\b${term}\\b`, 'i');
                if (termRegex.test(property.title)) property.score += 0.15;
                if (termRegex.test(property.type)) property.score += 0.15;
                if (termRegex.test(property.style)) property.score += 0.10;
                if (termRegex.test(property.view)) property.score += 0.10;
              });
              
              // Keep properties that match at least one term or have a direct match
              return termMatches.length > 0 || titleMatch || descMatch || locationMatch || 
                     typeMatch || styleMatch || viewMatch || furnishingMatch;
            });
            
            // Sort by score (highest first)
            results.sort((a, b) => b.score - a.score);
          }
        }
        
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
              } else if (attr === 'priceRanges') {
                // Handle price range filtering
                const ranges = value as {min?: number, max?: number, target?: number};
                const price = result.price;
                
                if (ranges.min && price < ranges.min) {
                  // Price is below minimum
                  isExactMatch = false;
                } else if (ranges.min && price >= ranges.min) {
                  // Price is above or equal to minimum (good)
                  matchBoost += 0.2;
                }
                
                if (ranges.max && price > ranges.max) {
                  // Price is above maximum
                  isExactMatch = false;
                } else if (ranges.max && price <= ranges.max) {
                  // Price is below or equal to maximum (good)
                  matchBoost += 0.2;
                }
                
                if (ranges.target) {
                  // If target is specified, boost score based on how close the price is to the target
                  const percentDiff = Math.abs(price - ranges.target) / ranges.target;
                  if (percentDiff <= 0.05) { // Within 5% of target
                    matchBoost += 0.35;
                  } else if (percentDiff <= 0.1) { // Within 10% of target
                    matchBoost += 0.25;
                  } else if (percentDiff <= 0.2) { // Within 20% of target
                    matchBoost += 0.15;
                  } else {
                    isExactMatch = false;
                  }
                }
              } else if (attr === 'targetLocation') {
                // Handle location proximity
                const targetLoc = value as { name: string, coordinates: { lat: number, lng: number } };
                
                // Check if property has coordinates
                if (result.coordinates) {
                  // Calculate distance between property and target location
                  const distance = calculateDistance(targetLoc.coordinates, result.coordinates);
                  result.distance = Math.round(distance * 10) / 10; // Round to 1 decimal place
                  
                  // Apply proximity boost based on distance
                  const proximityBoost = calculateProximityBoost(distance);
                  matchBoost += proximityBoost;
                  
                  // Consider it an exact match if it's very close (within 2km)
                  if (distance <= 2) {
                    matchBoost += 0.2; // Additional boost for very close properties
                  } else {
                    isExactMatch = false;
                  }
                } else {
                  // If no coordinates, check if the location name matches
                  if (result.location.toLowerCase().includes(targetLoc.name.toLowerCase()) || 
                      targetLoc.name.toLowerCase().includes(result.location.toLowerCase())) {
                    matchBoost += 0.15;
                  } else {
                    isExactMatch = false;
                  }
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
  
  // Check if a property image exists
  apiRouter.get("/property/image/:id", async (req: Request, res: Response) => {
    try {
      const propertyId = parseInt(req.params.id);
      const existingImage = getExistingPropertyImage(propertyId);
      
      res.json({ 
        exists: !!existingImage,
        filename: existingImage
      });
    } catch (error: any) {
      console.error("Error checking property image:", error);
      res.status(500).json({ 
        message: "Failed to check for existing image",
        error: error.message
      });
    }
  });

  // Generate property image endpoint
  apiRouter.post("/property/image/:id", async (req: Request, res: Response) => {
    try {
      // Check for OpenAI API key
      if (!process.env.OPENAI_API_KEY) {
        return res.status(503).json({ 
          message: "OpenAI API key is missing. Please set the OPENAI_API_KEY environment variable.",
          missingKey: "OPENAI_API_KEY" 
        });
      }

      const propertyId = parseInt(req.params.id);
      
      // Check if property exists
      const property = await storage.getPropertyById(propertyId);
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }

      // Check if an image already exists for this property
      const existingImage = getExistingPropertyImage(propertyId);
      if (existingImage) {
        return res.json({ 
          message: "Image already exists",
          filename: existingImage
        });
      }

      // Generate a new image
      const { filename } = await generatePropertyImage(property);
      
      res.json({ 
        message: "Image generated successfully",
        filename 
      });
    } catch (error: any) {
      console.error("Error generating image:", error);
      res.status(500).json({ 
        message: "An error occurred while generating the image",
        error: error.message
      });
    }
  });

  // Create a basic health check endpoint for Replit
  apiRouter.get("/healthcheck", (req: Request, res: Response) => {
    res.status(200).json({ status: 'ok', message: 'Server is running' });
  });

  // Serve generated images statically
  app.use("/generated-images", express.static("client/public/generated-images"));

  // Use the API router with prefix
  app.use("/api", apiRouter);

  // Return the HTTP server that was created at the beginning of this function
  return server;
}
