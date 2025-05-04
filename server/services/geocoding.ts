// Geocoding service to convert location names to coordinates
// Uses a simple mapping for demonstration purposes instead of external API

interface Coordinates {
  lat: number;
  lng: number;
}

// UK cities/regions with approximate coordinates
const locationCoordinates: Record<string, Coordinates> = {
  "London": { lat: 51.5074, lng: -0.1278 },
  "Manchester": { lat: 53.4808, lng: -2.2426 },
  "Birmingham": { lat: 52.4862, lng: -1.8904 },
  "Liverpool": { lat: 53.4084, lng: -2.9916 },
  "Edinburgh": { lat: 55.9533, lng: -3.1883 },
  "Glasgow": { lat: 55.8642, lng: -4.2518 },
  "Leeds": { lat: 53.8008, lng: -1.5491 },
  "Sheffield": { lat: 53.3811, lng: -1.4701 },
  "Bristol": { lat: 51.4545, lng: -2.5879 },
  "Newcastle": { lat: 54.9783, lng: -1.6178 },
  "Nottingham": { lat: 52.9548, lng: -1.1581 },
  "Cambridge": { lat: 52.2053, lng: 0.1218 },
  "Oxford": { lat: 51.7520, lng: -1.2577 },
  "Brighton": { lat: 50.8229, lng: -0.1363 },
  "York": { lat: 53.9600, lng: -1.0873 },
  "Bath": { lat: 51.3751, lng: -2.3617 },
  "Cardiff": { lat: 51.4816, lng: -3.1791 },
  "Belfast": { lat: 54.5973, lng: -5.9301 },
  "Leicester": { lat: 52.6369, lng: -1.1398 },
  "Coventry": { lat: 52.4068, lng: -1.5197 },
  // Generic areas
  "City Centre": { lat: 51.5074, lng: -0.1278 }, // Using London as default
  "Suburb": { lat: 51.5249, lng: -0.2332 }, // West London example
  "Countryside": { lat: 51.7608, lng: -1.2550 }, // Oxfordshire countryside
  "Coastal": { lat: 50.8229, lng: -0.1363 }, // Brighton as an example
  "Downtown": { lat: 51.5113, lng: -0.1162 } // Central London
};

/**
 * Get coordinates for a location name
 * Falls back to approximate coordinates for unknown locations
 */
export function getCoordinates(location: string): Coordinates {
  // Try to find exact match first
  if (locationCoordinates[location]) {
    return locationCoordinates[location];
  }
  
  // Try to find partial matches
  for (const [key, coords] of Object.entries(locationCoordinates)) {
    if (location.includes(key) || key.includes(location)) {
      return coords;
    }
  }
  
  // Default to London if no match is found
  return locationCoordinates["London"];
}

/**
 * Calculate distance between two sets of coordinates using Haversine formula
 * Returns distance in kilometers
 */
export function calculateDistance(coords1: Coordinates, coords2: Coordinates): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(coords2.lat - coords1.lat);
  const dLng = toRad(coords2.lng - coords1.lng);
  
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(toRad(coords1.lat)) * Math.cos(toRad(coords2.lat)) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  
  return distance;
}

/**
 * Convert degrees to radians
 */
function toRad(degrees: number): number {
  return degrees * Math.PI / 180;
}

/**
 * Parse a location from a query string
 * Looks for patterns like "near London", "close to Oxford", etc.
 */
export function parseLocationQuery(query: string): string | null {
  // Look for common location phrases
  const nearMatch = query.match(/(?:near|close to|in|by|around|next to)\s+([A-Za-z\s]+(?:City Centre|Suburb|Countryside|Coastal|Downtown|London|Manchester|Birmingham|Liverpool|Edinburgh|Glasgow|Leeds|Sheffield|Bristol|Newcastle|Nottingham|Cambridge|Oxford|Brighton|York|Bath|Cardiff|Belfast|Leicester|Coventry))/i);
  
  if (nearMatch && nearMatch[1]) {
    return nearMatch[1].trim();
  }
  
  return null;
}

/**
 * Calculate proximity score boost based on distance
 * Returns a value between 0 and 0.4, with 0.4 being for very close locations
 */
export function calculateProximityBoost(distance: number): number {
  if (distance < 1) {
    return 0.4; // Very close (less than 1km)
  } else if (distance < 5) {
    return 0.3; // Close (less than 5km)
  } else if (distance < 20) {
    return 0.2; // Somewhat close (less than 20km)
  } else if (distance < 50) {
    return 0.1; // Nearby (less than 50km)
  } else {
    return 0; // Not close enough for a boost
  }
}