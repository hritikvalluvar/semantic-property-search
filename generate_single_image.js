import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get the current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Ensure the images directory exists
const imagesDir = path.join(__dirname, "client", "public", "generated-images");
if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir, { recursive: true });
}

// Property to generate image for
const property = {
  id: 10,
  title: "Modern 2-bedroom Flat in Notting Hill",
  type: "Flat",
  style: "Modern",
  location: "Notting Hill",
  bedrooms: 2,
  bathrooms: 2,
  view: "City View",
  furnishing: "Furnished"
};

/**
 * Create a detailed prompt for image generation based on property details
 */
function createPropertyPrompt(property) {
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
 * Generate an image for a property using DALL-E
 */
async function generatePropertyImage(property) {
  try {
    // Create a detailed prompt based on property details
    const prompt = createPropertyPrompt(property);
    
    console.log(`Generating image for property ${property.id}: ${property.title}`);
    console.log(`Prompt: ${prompt}`);
    
    // Generate the image using DALL-E
    const response = await openai.images.generate({
      model: "dall-e-3", // The newest OpenAI image model
      prompt: prompt,
      n: 1, // Generate 1 image
      size: "1024x1024", // Standard size
      quality: "standard",
    });
    
    // Get the image URL
    const imageUrl = response.data?.[0]?.url;
    
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
    
    console.log(`Successfully generated image for property ${property.id}: ${filename}`);
    return { success: true, filename };
  } catch (error) {
    console.error(`Error generating image for property ${property.id}:`, error);
    return { success: false, error: error.message };
  }
}

// Generate a single image
console.log("Testing DALL-E image generation for a single property...");
generatePropertyImage(property).then(result => {
  if (result.success) {
    console.log("✅ Successfully generated a real image! You can now run generate_real_images.js to gradually generate more images.");
  } else {
    console.log("❌ Failed to generate a real image. Check the error message above for more details.");
  }
}).catch(error => {
  console.error("❌ Error during image generation test:", error);
});