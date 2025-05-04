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

/**
 * Create a fallback SVG image for properties when image generation fails
 * @param property The property details
 * @returns The filename of the generated SVG
 */
export function createFallbackSvg(property: Property): string {
  const filename = `property-${property.id}-${Date.now()}.svg`;
  const placeholderPath = path.join(imagesDir, filename);
  
  // Get property view gradient colors
  const viewColors = getViewColors(property.view);
  
  // Get property style-based design
  const styleDesign = getStyleDesign(property.style);
  
  // More detailed SVG with gradients and property-specific styling
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
    <!-- Background gradient based on property view -->
    <defs>
      <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${viewColors.start}" />
        <stop offset="100%" stop-color="${viewColors.end}" />
      </linearGradient>
      <linearGradient id="propertyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${styleDesign.startColor}" />
        <stop offset="100%" stop-color="${styleDesign.endColor}" />
      </linearGradient>
      <filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur in="SourceAlpha" stdDeviation="10" />
        <feOffset dx="5" dy="5" result="offsetblur" />
        <feComponentTransfer>
          <feFuncA type="linear" slope="0.2" />
        </feComponentTransfer>
        <feMerge>
          <feMergeNode />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
    
    <!-- Main background -->
    <rect width="1024" height="1024" fill="url(#bgGradient)" />
    
    <!-- Property card -->
    <rect x="50" y="50" width="924" height="924" fill="#ffffff" rx="30" ry="30" filter="url(#dropShadow)" />
    
    <!-- Property image area -->
    <rect x="100" y="100" width="824" height="500" fill="url(#propertyGradient)" rx="20" ry="20" />
    
    <!-- Property type icon -->
    ${styleDesign.icon}
    
    <!-- Property details -->
    <text x="512" y="650" font-family="Arial" font-size="40" font-weight="bold" text-anchor="middle" fill="#1a202c">${property.style} ${property.type}</text>
    <text x="512" y="700" font-family="Arial" font-size="32" text-anchor="middle" fill="#4a5568">${property.location}</text>
    <text x="512" y="750" font-family="Arial" font-size="28" text-anchor="middle" fill="#718096">${property.bedrooms} bed, ${property.bathrooms} bath · ${property.view}</text>
    <text x="512" y="820" font-family="Arial" font-size="32" font-weight="bold" text-anchor="middle" fill="#2d3748">£${property.price.toLocaleString()}</text>
    <text x="512" y="870" font-family="Arial" font-size="24" text-anchor="middle" fill="#718096">${property.furnishing}</text>
    
    <!-- Property ID -->
    <text x="950" y="990" font-family="Arial" font-size="16" text-anchor="end" fill="#a0aec0">ID: ${property.id}</text>
  </svg>`;
  
  fs.writeFileSync(placeholderPath, svg);
  console.log(`Created SVG placeholder for property ${property.id}`);
  
  return filename;
}

/**
 * Get gradient colors based on property view
 */
function getViewColors(view: string): { start: string; end: string } {
  const viewLower = view.toLowerCase();
  
  if (viewLower.includes('park') || viewLower.includes('garden'))
    return { start: '#e6fffa', end: '#c6f6d5' }; // Green tones
  else if (viewLower.includes('river') || viewLower.includes('sea') || viewLower.includes('lake'))
    return { start: '#ebf8ff', end: '#bee3f8' }; // Blue tones
  else if (viewLower.includes('city'))
    return { start: '#fefcbf', end: '#faf089' }; // Yellow tones (city lights)
  else if (viewLower.includes('mountain') || viewLower.includes('forest'))
    return { start: '#edf2f7', end: '#e2e8f0' }; // Grey tones
  else
    return { start: '#f7fafc', end: '#edf2f7' }; // Default light grey
}

/**
 * Get design properties based on property style
 */
function getStyleDesign(style: string): { startColor: string; endColor: string; icon: string } {
  const styleLower = style.toLowerCase();
  
  if (styleLower.includes('modern') || styleLower.includes('contemporary')) {
    return {
      startColor: '#4299e1',
      endColor: '#3182ce',
      icon: `<path d="M300 350 L724 350 L724 500 L300 500 Z" fill="#ffffff" fill-opacity="0.5" />
             <rect x="350" y="400" width="100" height="50" fill="#ffffff" fill-opacity="0.8" />
             <rect x="500" y="400" width="100" height="50" fill="#ffffff" fill-opacity="0.8" />`
    };
  } else if (styleLower.includes('victorian') || styleLower.includes('georgian') || styleLower.includes('colonial')) {
    return {
      startColor: '#b794f4',
      endColor: '#9f7aea',
      icon: `<path d="M512 200 L350 450 L674 450 Z" fill="#ffffff" fill-opacity="0.5" />
             <rect x="400" y="450" width="224" height="100" fill="#ffffff" fill-opacity="0.8" />`
    };
  } else if (styleLower.includes('traditional') || styleLower.includes('rustic')) {
    return {
      startColor: '#ed8936',
      endColor: '#dd6b20',
      icon: `<path d="M350 350 L512 250 L674 350 L674 500 L350 500 Z" fill="#ffffff" fill-opacity="0.5" />
             <rect x="450" y="400" width="124" height="100" fill="#ffffff" fill-opacity="0.8" />`
    };
  } else if (styleLower.includes('art deco') || styleLower.includes('deco')) {
    return {
      startColor: '#f6ad55',
      endColor: '#ed8936',
      icon: `<circle cx="512" cy="350" r="100" fill="#ffffff" fill-opacity="0.7" />
             <path d="M412 400 L612 400 L612 500 L412 500 Z" fill="#ffffff" fill-opacity="0.5" />`
    };
  } else if (styleLower.includes('minimalist')) {
    return {
      startColor: '#a0aec0',
      endColor: '#718096',
      icon: `<rect x="400" y="300" width="224" height="150" fill="#ffffff" fill-opacity="0.6" />`
    };
  } else if (styleLower.includes('industrial')) {
    return {
      startColor: '#718096',
      endColor: '#4a5568',
      icon: `<rect x="350" y="300" width="324" height="150" fill="#ffffff" fill-opacity="0.5" />
             <line x1="350" y1="350" x2="674" y2="350" stroke="#ffffff" stroke-width="3" />`
    };
  } else {
    // Default design
    return {
      startColor: '#68d391',
      endColor: '#48bb78',
      icon: `<path d="M400 300 L624 300 L624 450 L400 450 Z" fill="#ffffff" fill-opacity="0.5" />`
    };
  }
}