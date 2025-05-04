import fs from 'fs';
import path from 'path';
import { parse as parseCsv } from 'csv-parse/sync';
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

/**
 * Check if a property already has a generated image
 */
function getExistingPropertyImage(propertyId) {
  try {
    // Check for any files that match the property ID pattern
    const files = fs.readdirSync(imagesDir);
    const propertyImage = files.find(file => file.startsWith(`property-${propertyId}-`));
    
    // Return the filename if it's a PNG image, indicating a real generated image
    if (propertyImage && propertyImage.endsWith('.png')) {
      return propertyImage;
    }
    
    return null;
  } catch (error) {
    console.error(`Error checking for existing property image for property ${propertyId}:`, error);
    return null;
  }
}

/**
 * Main function to generate images for all properties with rate limiting
 */
async function generateRealImages() {
  try {
    // Read the CSV file
    const csvData = fs.readFileSync('semantic_property_listings.csv', 'utf8');
    const properties = parseCsv(csvData, { columns: true, skip_empty_lines: true });
    
    console.log(`Loaded ${properties.length} properties from CSV`);
    
    // Track generation statistics
    let generatedCount = 0;
    let existingCount = 0;
    let errorCount = 0;
    
    // Create batches of properties (even more conservative - 1 property at a time)
    const propertiesToProcess = [];
    
    // Filter properties that don't already have PNG images
    for (const property of properties) {
      const existingImage = getExistingPropertyImage(property.id);
      if (existingImage) {
        console.log(`Property ${property.id} already has a real image: ${existingImage}`);
        existingCount++;
      } else {
        propertiesToProcess.push(property);
      }
    }
    
    console.log(`Found ${propertiesToProcess.length} properties that need real images`);
    console.log(`Using ultra-conservative rate limiting: 1 image every 30 seconds`);
    
    // Process one property at a time with a 30-second delay between each
    for (let i = 0; i < propertiesToProcess.length; i++) {
      const property = propertiesToProcess[i];
      console.log(`\nProcessing property ${i + 1} of ${propertiesToProcess.length}: ${property.id} - ${property.title}`);
      
      // Try to generate an image with retries
      let attempts = 0;
      let success = false;
      
      while (attempts < 3 && !success) {
        try {
          attempts++;
          if (attempts > 1) {
            console.log(`Retry attempt ${attempts} for property ${property.id}`);
          }
          
          const result = await generatePropertyImage(property);
          
          if (result.success) {
            generatedCount++;
            success = true;
          } else {
            // If we're hitting rate limits, wait longer
            if (result.error && 
               (result.error.toLowerCase().includes('rate limit') || 
                result.error.toLowerCase().includes('429'))) {
              console.log(`Rate limit hit, waiting 2 minutes to cool down...`);
              await new Promise(resolve => setTimeout(resolve, 120000)); // 2 minutes
            }
            errorCount++;
          }
        } catch (error) {
          console.error(`Unexpected error processing property ${property.id}:`, error);
          errorCount++;
        }
      }
      
      // Wait 30 seconds between properties to be very conservative with rate limits
      if (i < propertiesToProcess.length - 1) {
        console.log(`Waiting 30 seconds before processing the next property...`);
        await new Promise(resolve => setTimeout(resolve, 30000));
      }
    }
    
    console.log(`\nImage generation complete:`);
    console.log(`- Generated PNG: ${generatedCount}`);
    console.log(`- Existing PNG: ${existingCount}`);
    console.log(`- Errors: ${errorCount}`);
    console.log(`- Total properties: ${properties.length}`);
    
  } catch (error) {
    console.error('Error in generateRealImages:', error);
  }
}

// Run the main function
console.log("Starting real image generation process with rate limiting for free tier...");
generateRealImages().then(() => {
  console.log("Real image generation process completed.");
}).catch(error => {
  console.error("Real image generation process failed:", error);
});