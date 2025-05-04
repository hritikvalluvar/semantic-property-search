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
 * Create a detailed prompt for image generation based on property details and description
 */
function createPropertyPrompt(property) {
  // Get base property details
  const { type, style, location, view, bedrooms, bathrooms, furnishing, price } = property;
  
  // Base visualization style based on property type and style
  let visualStyle = '';
  
  // Customize visualization style based on property characteristics
  if (style.toLowerCase().includes('modern')) {
    visualStyle = 'with clean lines, minimalist design, large windows, and contemporary furnishings';
  } else if (style.toLowerCase().includes('victorian')) {
    visualStyle = 'with ornate details, classic architecture, high ceilings, and period-appropriate design elements';
  } else if (style.toLowerCase().includes('contemporary')) {
    visualStyle = 'with open floor plans, stylish fixtures, and a blend of textures and materials';
  } else if (style.toLowerCase().includes('rustic')) {
    visualStyle = 'with wooden beams, natural materials, earthy colors, and cozy design elements';
  } else if (style.toLowerCase().includes('minimalist')) {
    visualStyle = 'with clean, uncluttered spaces, neutral colors, and functional design';
  } else {
    visualStyle = 'with attractive design elements appropriate for the architectural style';
  }
  
  // View-specific details
  let viewDescription = '';
  if (view && !view.toLowerCase().includes('no view')) {
    if (view.toLowerCase().includes('ocean')) {
      viewDescription = 'with stunning panoramic ocean views visible from large windows';
    } else if (view.toLowerCase().includes('mountain')) {
      viewDescription = 'with breathtaking mountain vistas visible from the property';
    } else if (view.toLowerCase().includes('city')) {
      viewDescription = 'with impressive cityscape views visible from the living areas';
    } else if (view.toLowerCase().includes('park')) {
      viewDescription = 'overlooking lush green parkland visible from the property';
    } else if (view.toLowerCase().includes('garden')) {
      viewDescription = 'with beautiful garden views that provide a serene atmosphere';
    } else {
      viewDescription = `with lovely ${view.toLowerCase()} that enhance the living experience`;
    }
  }
  
  // Price tier adjustments for luxury properties
  let luxuryTier = '';
  if (price > 1000000) {
    luxuryTier = 'luxury, high-end';
  } else if (price > 500000) {
    luxuryTier = 'upscale, premium';
  } else {
    luxuryTier = 'quality';
  }

  // Create an enhanced description that builds upon the base description
  let enhancedDescription = '';
  if (property.description && property.description.length > 10) {
    // Use the existing description as a foundation
    enhancedDescription = property.description.replace(/^A |^An /i, ''); // Remove leading article
  } else {
    // Create a basic description if none exists
    enhancedDescription = `${style} ${type.toLowerCase()} in ${location} with ${bedrooms} bedrooms and ${bathrooms} bathrooms`;
    if (view && !view.toLowerCase().includes('no view')) {
      enhancedDescription += ` featuring ${view.toLowerCase()}`;
    }
    if (furnishing.toLowerCase() !== 'unfurnished') {
      enhancedDescription += `, ${furnishing.toLowerCase()}`;
    }
  }
  
  // Create a detailed prompt for architectural visualization
  const prompt = `Create a photorealistic architectural visualization of a ${luxuryTier} ${style.toLowerCase()} ${type.toLowerCase()} in ${location}. 
  
The property features:
- ${bedrooms} spacious bedrooms and ${bathrooms} well-appointed bathrooms
- ${enhancedDescription}
- ${visualStyle}
${viewDescription ? '- ' + viewDescription : ''}
${furnishing.toLowerCase() !== 'unfurnished' ? '- ' + furnishing + ' with tasteful decor and furnishings' : ''}

Make it a professional real estate photograph with natural lighting, high-quality design, showing both interior and exterior elements where possible. Ensure the image has depth, proper perspective, and attractive landscaping. The image should highlight the property's best features and appeal to potential buyers or renters.`;
  
  return prompt;
}

/**
 * Generate an image for a property using DALL-E
 */
async function generatePropertyImage(property) {
  try {
    // Create a detailed prompt based on property details and description
    const prompt = createPropertyPrompt(property);
    
    console.log(`Generating image for property ${property.id}: ${property.title}`);
    console.log(`Using ${prompt.length} character prompt based on property details and description`);
    
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
    let properties = parseCsv(csvData, { columns: true, skip_empty_lines: true });
    
    // Convert numeric fields to proper types
    properties = properties.map(prop => ({
      ...prop,
      id: parseInt(prop.id, 10),
      bedrooms: parseInt(prop.bedrooms, 10),
      bathrooms: parseInt(prop.bathrooms, 10),
      price: parseFloat(prop.price)
    }));
    
    console.log(`Loaded ${properties.length} properties from CSV`);
    
    // Track generation statistics
    let generatedCount = 0;
    let existingCount = 0;
    let errorCount = 0;
    
    // Create batches of properties (25 per batch for paid tier - conservative estimate)
    const batchSize = 5;
    const propertiesToProcess = [];
    
    // For the first test run, just try to process the first 3 properties
    const isTesting = true; // Set to false to process all properties
    const testLimit = 3; // Number of properties to process in test mode
    
    // Filter properties that don't already have PNG images
    for (const property of properties) {
      const existingImage = getExistingPropertyImage(property.id);
      if (existingImage) {
        console.log(`Property ${property.id} already has a real image: ${existingImage}`);
        existingCount++;
      } else {
        propertiesToProcess.push(property);
        // Limit to just a few properties for testing
        if (isTesting && propertiesToProcess.length >= testLimit) {
          console.log(`Limiting to ${testLimit} properties for test run. Set isTesting=false in the code to process all properties.`);
          break;
        }
      }
    }
    
    console.log(`Found ${propertiesToProcess.length} properties that need real images`);
    console.log(`Using paid tier with a batch size of ${batchSize} and 10 second intervals between images`);
    
    // Process properties in batches
    for (let i = 0; i < propertiesToProcess.length; i += batchSize) {
      const batch = propertiesToProcess.slice(i, i + batchSize);
      console.log(`\nProcessing batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(propertiesToProcess.length / batchSize)}`);
      
      // Process properties in the batch one at a time with small delays between them
      for (let j = 0; j < batch.length; j++) {
        const property = batch[j];
        console.log(`Processing property ${i + j + 1} of ${propertiesToProcess.length}: ${property.id} - ${property.title}`);
        
        // Try to generate the image with retries
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
              // If we hit rate limits, wait longer and retry
              if (result.error && 
                 (result.error.toLowerCase().includes('rate limit') || 
                  result.error.toLowerCase().includes('429'))) {
                console.log(`Rate limit hit, waiting 60 seconds to cool down...`);
                await new Promise(resolve => setTimeout(resolve, 60000)); // 1 minute
              }
              
              if (!success && attempts >= 3) {
                errorCount++;
              }
            }
          } catch (error) {
            console.error(`Unexpected error processing property ${property.id}:`, error);
            if (attempts >= 3) {
              errorCount++;
            }
          }
        }
        
        // Wait 10 seconds between properties to avoid hitting rate limits
        if (j < batch.length - 1) {
          console.log(`Waiting 10 seconds before processing the next property...`);
          await new Promise(resolve => setTimeout(resolve, 10000));
        }
      }
      
      // If there are more batches to process, wait 30 seconds between batches
      if (i + batchSize < propertiesToProcess.length) {
        console.log(`\nCompleted batch. Waiting 30 seconds before starting the next batch...`);
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
console.log("Starting image generation process with paid OpenAI account...");
console.log("Using property descriptions and details to create prompts...");
generateRealImages().then(() => {
  console.log("Image generation process completed.");
}).catch(error => {
  console.error("Image generation process failed:", error);
});