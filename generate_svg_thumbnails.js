import fs from 'fs';
import path from 'path';
import { parse as parseCsv } from 'csv-parse/sync';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get the current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Ensure the images directory exists
const imagesDir = path.join(__dirname, "client", "public", "generated-images");
if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir, { recursive: true });
}

/**
 * Create a fallback SVG image for properties
 */
function createPropertySvg(property) {
  try {
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
      <text x="512" y="820" font-family="Arial" font-size="32" font-weight="bold" text-anchor="middle" fill="#2d3748">£${parseInt(property.price).toLocaleString()}</text>
      <text x="512" y="870" font-family="Arial" font-size="24" text-anchor="middle" fill="#718096">${property.furnishing}</text>
      
      <!-- Property ID -->
      <text x="950" y="990" font-family="Arial" font-size="16" text-anchor="end" fill="#a0aec0">ID: ${property.id}</text>
    </svg>`;
    
    fs.writeFileSync(placeholderPath, svg);
    console.log(`Created SVG thumbnail for property ${property.id}`);
    
    return filename;
  } catch (error) {
    console.error(`Error creating SVG for property ${property.id}:`, error);
    return null;
  }
}

/**
 * Get gradient colors based on property view
 */
function getViewColors(view) {
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
function getStyleDesign(style) {
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
 * Main function to generate SVG thumbnails for all properties
 */
async function generateAllThumbnails() {
  try {
    // Read the CSV file
    const csvData = fs.readFileSync('semantic_property_listings.csv', 'utf8');
    const properties = parseCsv(csvData, { columns: true, skip_empty_lines: true });
    
    console.log(`Loaded ${properties.length} properties from CSV`);
    
    // Track generation statistics
    let createdCount = 0;
    let existingCount = 0;
    let errorCount = 0;
    
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
        
        // Create SVG thumbnail
        const filename = createPropertySvg(property);
        
        if (filename) {
          createdCount++;
        } else {
          errorCount++;
        }
      } catch (error) {
        console.error(`Error processing property ${property.id}:`, error);
        errorCount++;
      }
    }
    
    console.log(`SVG thumbnail generation complete:`);
    console.log(`- Created: ${createdCount}`);
    console.log(`- Existing: ${existingCount}`);
    console.log(`- Errors: ${errorCount}`);
    console.log(`- Total properties: ${properties.length}`);
    
  } catch (error) {
    console.error('Error in generateAllThumbnails:', error);
  }
}

// Run the main function
console.log("Starting SVG thumbnail generation process...");
generateAllThumbnails().then(() => {
  console.log("SVG thumbnail generation process completed.");
}).catch(error => {
  console.error("SVG thumbnail generation process failed:", error);
});