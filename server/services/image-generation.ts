import OpenAI from "openai";
import { Property } from "@shared/schema";
import path from "path";
import fs from "fs";

// Initialize OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Ensure the images directory exists
const imagesDir = path.join(process.cwd(), "client", "public", "generated-images");
if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir, { recursive: true });
}

/**
 * Generate an image for a property based on its description
 * @param property The property details
 * @returns Object containing the image filename
 */
export async function generatePropertyImage(property: Property): Promise<{ filename: string }> {
  try {
    // Create a detailed prompt based on property details
    const prompt = createPropertyPrompt(property);
    
    // Generate the image using DALL-E
    let imageUrl;
    try {
      const response = await openai.images.generate({
        model: "dall-e-3", // The newest OpenAI image model is "dall-e-3" which was released after the knowledge cutoff
        prompt: prompt,
        n: 1, // Generate 1 image
        size: "1024x1024", // Standard size
        quality: "standard",
      });
      
      // Get the image URL
      imageUrl = response.data?.[0]?.url;
    } catch (error: any) {
      console.error("OpenAI image generation error:", error);
      if (error.status === 429) {
        throw new Error("OpenAI rate limit exceeded. Please try again later.");
      }
      throw error;
    }
    
    if (!imageUrl) {
      throw new Error("No image URL returned from OpenAI");
    }

    // Download the image
    const imageResponse = await fetch(imageUrl);
    const arrayBuffer = await imageResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Create a unique filename based on property ID
    const filename = `property-${property.id}-${Date.now()}.png`;
    const filepath = path.join(imagesDir, filename);
    
    // Save the image to the filesystem
    fs.writeFileSync(filepath, buffer);
    
    return { filename };
  } catch (error) {
    console.error("Error generating property image:", error);
    throw error;
  }
}

/**
 * Create a detailed prompt for image generation based on property details
 */
function createPropertyPrompt(property: Property): string {
  const { type, style, location, view, bedrooms, bathrooms, furnishing } = property;
  
  // Base characteristics
  let propertyDescription = `A ${style.toLowerCase()} ${type.toLowerCase()} in ${location}`;
  
  // Add bedrooms and bathrooms info
  propertyDescription += ` with ${bedrooms} bedroom${bedrooms !== 1 ? 's' : ''}`;
  propertyDescription += ` and ${bathrooms} bathroom${bathrooms !== 1 ? 's' : ''}`;
  
  // Add view info if available
  if (view) {
    propertyDescription += `, featuring a ${view.toLowerCase()} view`;
  }
  
  // Add furnishing info
  if (furnishing.toLowerCase() !== 'unfurnished') {
    propertyDescription += `, ${furnishing.toLowerCase()}`;
  }
  
  // Create architectural visualization prompt with photorealistic style
  const prompt = `Create a photorealistic architectural visualization of ${propertyDescription}. 
  Make it a professional real estate photograph with natural lighting, 
  high-quality modern design, showing both interior and exterior elements where possible. 
  Ensure the image has depth, proper perspective, and attractive landscaping.`;
  
  return prompt;
}

/**
 * Check if a property already has a generated image
 * @param propertyId The property ID to check
 * @returns The filename if found, null otherwise
 */
export function getExistingPropertyImage(propertyId: string | number): string | null {
  try {
    // Check for any files that match the property ID pattern
    const files = fs.readdirSync(imagesDir);
    const propertyImage = files.find(file => file.startsWith(`property-${propertyId}-`));
    
    return propertyImage || null;
  } catch (error) {
    console.error("Error checking for existing property image:", error);
    return null;
  }
}