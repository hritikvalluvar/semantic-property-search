import express, { type Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { getEmbedding } from "./services/openai";
import { searchVectors } from "./services/pinecone";
import { generatePropertyImage, getExistingPropertyImage } from "./services/image-generation";
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
        // Import geocoding utilities
        const { parseLocationQuery, getCoordinates, calculateDistance, calculateProximityBoost } = await import('./services/geocoding');
        
        // Extract specific attributes from the query
        const bedroomMatch = query.match(/(\d+)[\s-]bed/i);
        const bathroomMatch = query.match(/(\d+)[\s-]bath/i);
        const specificAttributes: Record<string, any> = {};
        const priceRanges: {min?: number, max?: number, target?: number} = {};
        
        // Extract location proximity information
        const locationQuery = parseLocationQuery(query);
        let targetLocation = null;
        if (locationQuery) {
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

  // Serve generated images statically
  app.use("/generated-images", express.static("client/public/generated-images"));

  // Use the API router with prefix
  app.use("/api", apiRouter);

  const httpServer = createServer(app);
  return httpServer;
}
