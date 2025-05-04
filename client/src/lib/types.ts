// Property data types
export interface PropertyListing {
  id: string;
  title: string;
  description: string;
  location: string;
  type: string;
  style: string;
  bedrooms: number;
  bathrooms: number;
  price: number;
  view: string;
  furnishing: string;
}

// Search result including match score
export interface SearchResult extends PropertyListing {
  score: number;
  exactMatch?: boolean;
  distance?: number; // Distance in km from the search location
}

// Filter state structure
export interface FilterState {
  type: string[];
  style: string[];
  location: string[];
  bedrooms: number[];
  bathrooms: number[];
  price: number[];
  view: string[];
  furnishing: string[];
}

// Filter options from the API
export interface FilterOptions {
  types: string[];
  styles: string[];
  locations: string[];
  bedrooms: { min: number; max: number };
  bathrooms: { min: number; max: number };
  price: { min: number; max: number };
  views: string[];
  furnishings: string[];
}

// Search request payload
export interface SearchRequest {
  query: string;
}
