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
    return { filename };
  } catch (error) {
    console.error(`Error generating image for property ${property.id}:`, error);
    
    // Create a fallback SVG image
    const filename = createFallbackSvg(property);
    return { filename };
  }
}

/**
 * Create a fallback SVG image for properties when image generation fails
 */
function createFallbackSvg(property) {
  const filename = `property-${property.id}-${Date.now()}.svg`;
  const placeholderPath = path.join(imagesDir, filename);
  
  // Create a simple SVG for the property
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
    <rect width="1024" height="1024" fill="#f0f4f8"/>
    <rect x="50" y="50" width="924" height="924" fill="#e1e8ed" rx="20" ry="20"/>
    <rect x="150" y="150" width="724" height="524" fill="#d1dbe3" rx="10" ry="10"/>
    <text x="512" y="400" font-family="Arial" font-size="32" text-anchor="middle" fill="#4a5568">${property.type}</text>
    <text x="512" y="450" font-family="Arial" font-size="28" text-anchor="middle" fill="#4a5568">${property.location}</text>
    <text x="512" y="500" font-family="Arial" font-size="24" text-anchor="middle" fill="#4a5568">${property.bedrooms} bed, ${property.bathrooms} bath</text>
    <text x="512" y="750" font-family="Arial" font-size="36" font-weight="bold" text-anchor="middle" fill="#2d3748">£${parseInt(property.price).toLocaleString()}</text>
  </svg>`;
  
  fs.writeFileSync(placeholderPath, svg);
  console.log(`Created SVG placeholder for property ${property.id}`);
  
  return filename;
}

/**
 * Check if a property already has a generated image
 */
function getExistingPropertyImage(propertyId) {
  try {
    // Check for any files that match the property ID pattern
    const files = fs.readdirSync(imagesDir);
    const propertyImage = files.find(file => file.startsWith(`property-${propertyId}-`));
    
    return propertyImage || null;
  } catch (error) {
    console.error(`Error checking for existing property image for property ${propertyId}:`, error);
    return null;
  }
}

/**
 * Main function to generate images for all properties
 */
async function generateAllImages() {
  try {
    // Read the CSV file
    const csvData = fs.readFileSync('semantic_property_listings.csv', 'utf8');
    const properties = parseCsv(csvData, { columns: true, skip_empty_lines: true });
    
    console.log(`Loaded ${properties.length} properties from CSV`);
    
    // Track generation statistics
    let generatedCount = 0;
    let existingCount = 0;
    let fallbackCount = 0;
    
    // Process each property
    for (const property of properties) {
      try {
        // Check if image already exists
        const existingImage = getExistingPropertyImage(property.id);
        if (existingImage) {
          console.log(`Image already exists for property ${property.id}: ${existingImage}`);
          existingCount++;
          continue;
        }
        
        // Generate a new image for this property
        const result = await generatePropertyImage(property);
        
        if (result.filename.endsWith('.svg')) {
          fallbackCount++;
        } else {
          generatedCount++;
        }
        
        // Add a small delay to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Error processing property ${property.id}:`, error);
        fallbackCount++;
      }
    }
    
    console.log(`Image generation complete:`);
    console.log(`- Generated PNG: ${generatedCount}`);
    console.log(`- Fallback SVG: ${fallbackCount}`);
    console.log(`- Existing: ${existingCount}`);
    console.log(`- Total properties: ${properties.length}`);
    
  } catch (error) {
    console.error('Error in generateAllImages:', error);
  }
}

// Run the main function
console.log("Starting image generation process...");
generateAllImages().then(() => {
  console.log("Image generation process completed.");
}).catch(error => {
  console.error("Image generation process failed:", error);
});