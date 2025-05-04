import { useState } from "react";
import { SearchResult, FilterState, FilterOptions } from "@/lib/types";
import { PropertyCard } from "./PropertyCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

interface PropertyResultsProps {
  searchResults: SearchResult[];
  isSearching: boolean;
  hasSearched: boolean;
  resetFilters: () => void;
  filters?: FilterState | null;
  filterOptions?: FilterOptions | null;
}

export function PropertyResults({
  searchResults,
  isSearching,
  hasSearched,
  resetFilters,
  filters,
  filterOptions
}: PropertyResultsProps) {
  // Helper to get active filter names
  const getActiveFilterNames = (filterType: keyof FilterState, optionsArray?: string[]) => {
    if (!filters || !optionsArray) return [];
    
    const activeFilters = filters[filterType] as string[];
    if (!Array.isArray(activeFilters)) return [];
    
    return activeFilters;
  };
  
  // Helper to count total active filters
  const countActiveFilters = () => {
    if (!filters) return 0;
    
    let count = 0;
    if (filters.type.length) count += filters.type.length;
    if (filters.style.length) count += filters.style.length;
    if (filters.location.length) count += filters.location.length;
    if (filters.view.length) count += filters.view.length;
    if (filters.furnishing.length) count += filters.furnishing.length;
    
    // Count range filters if they're not at min/max
    if (filterOptions) {
      if (filters.bedrooms[0] > filterOptions.bedrooms.min || 
          filters.bedrooms[1] < filterOptions.bedrooms.max) {
        count += 1;
      }
      
      if (filters.bathrooms[0] > filterOptions.bathrooms.min || 
          filters.bathrooms[1] < filterOptions.bathrooms.max) {
        count += 1;
      }
      
      if (filters.price[0] > filterOptions.price.min || 
          filters.price[1] < filterOptions.price.max) {
        count += 1;
      }
    }
    
    return count;
  };
  
  // Format price with commas
  const formatPrice = (price: number) => {
    return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };
  
  return (
    <div>
      {/* State: No search performed yet */}
      {!hasSearched && !isSearching && (
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <div className="text-5xl mb-4">🏠</div>
          <h3 className="text-gray-700 text-xl font-medium mb-2">Start your property search</h3>
          <p className="text-gray-500">Enter a description of your ideal property using natural language or select one of the sample searches above.</p>
        </div>
      )}
      
      {/* State: Loading results */}
      {isSearching && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-lg shadow-md p-5">
              <div className="flex justify-between">
                <Skeleton className="h-7 w-3/4 rounded mb-3" />
                <Skeleton className="h-6 w-[100px] rounded" />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                <Skeleton className="h-5 w-full rounded" />
                <Skeleton className="h-5 w-full rounded" />
                <Skeleton className="h-5 w-full rounded" />
                <Skeleton className="h-5 w-full rounded" />
              </div>
              <div className="flex justify-between items-baseline mb-3">
                <Skeleton className="h-8 w-[120px] rounded" />
                <Skeleton className="h-5 w-[100px] rounded" />
              </div>
              <Skeleton className="h-20 w-full rounded mb-3" />
              <div className="flex gap-2">
                <Skeleton className="h-6 w-[100px] rounded" />
                <Skeleton className="h-6 w-[120px] rounded" />
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* State: No results found */}
      {hasSearched && searchResults.length === 0 && !isSearching && (
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <div className="text-5xl mb-4">🔍</div>
          <h3 className="text-gray-700 text-xl font-medium mb-2">No properties found</h3>
          <p className="text-gray-500">Try adjusting your search query or filters to find more properties.</p>
          <Button 
            onClick={resetFilters} 
            className="mt-4"
          >
            Reset Filters
          </Button>
        </div>
      )}
      
      {/* State: Results found */}
      {hasSearched && searchResults.length > 0 && !isSearching && (
        <>
          <div className="mb-4">
            <h2 className="font-heading text-xl font-semibold text-gray-800 flex items-center">
              <i className="ri-home-4-line mr-2 text-primary"></i>
              Top Matching Properties
              <span className="ml-2 text-sm font-normal text-gray-500">({searchResults.length} results)</span>
            </h2>
            
            {/* Active filters */}
            {filters && filterOptions && countActiveFilters() > 0 && (
              <div className="mt-3">
                <div className="flex items-center">
                  <p className="text-sm text-gray-600 mr-2">Active Filters:</p>
                  <Button 
                    variant="link" 
                    size="sm" 
                    className="h-auto p-0 text-xs text-primary underline"
                    onClick={resetFilters}
                  >
                    Reset All
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {/* Property Types */}
                  {getActiveFilterNames('type', filterOptions.types).map(type => (
                    <Badge 
                      key={`type-${type}`} 
                      variant="outline" 
                      className="bg-primary/5 text-primary text-xs px-2 py-1 font-normal flex items-center gap-1"
                    >
                      {type}
                    </Badge>
                  ))}
                  
                  {/* Styles */}
                  {getActiveFilterNames('style', filterOptions.styles).map(style => (
                    <Badge 
                      key={`style-${style}`} 
                      variant="outline" 
                      className="bg-primary/5 text-primary text-xs px-2 py-1 font-normal flex items-center gap-1"
                    >
                      {style}
                    </Badge>
                  ))}
                  
                  {/* Locations */}
                  {getActiveFilterNames('location', filterOptions.locations).map(location => (
                    <Badge 
                      key={`location-${location}`} 
                      variant="outline" 
                      className="bg-primary/5 text-primary text-xs px-2 py-1 font-normal flex items-center gap-1"
                    >
                      {location}
                    </Badge>
                  ))}
                  
                  {/* Views */}
                  {getActiveFilterNames('view', filterOptions.views).map(view => (
                    <Badge 
                      key={`view-${view}`} 
                      variant="outline" 
                      className="bg-primary/5 text-primary text-xs px-2 py-1 font-normal flex items-center gap-1"
                    >
                      {view}
                    </Badge>
                  ))}
                  
                  {/* Furnishings */}
                  {getActiveFilterNames('furnishing', filterOptions.furnishings).map(furnishing => (
                    <Badge 
                      key={`furnishing-${furnishing}`} 
                      variant="outline" 
                      className="bg-primary/5 text-primary text-xs px-2 py-1 font-normal flex items-center gap-1"
                    >
                      {furnishing}
                    </Badge>
                  ))}
                  
                  {/* Bedrooms range (if not default) */}
                  {(filters.bedrooms[0] > filterOptions.bedrooms.min || 
                    filters.bedrooms[1] < filterOptions.bedrooms.max) && (
                    <Badge 
                      variant="outline" 
                      className="bg-primary/5 text-primary text-xs px-2 py-1 font-normal flex items-center gap-1"
                    >
                      {filters.bedrooms[0]} - {filters.bedrooms[1]} Bedrooms
                    </Badge>
                  )}
                  
                  {/* Bathrooms range (if not default) */}
                  {(filters.bathrooms[0] > filterOptions.bathrooms.min || 
                    filters.bathrooms[1] < filterOptions.bathrooms.max) && (
                    <Badge 
                      variant="outline" 
                      className="bg-primary/5 text-primary text-xs px-2 py-1 font-normal flex items-center gap-1"
                    >
                      {filters.bathrooms[0]} - {filters.bathrooms[1]} Bathrooms
                    </Badge>
                  )}
                  
                  {/* Price range (if not default) */}
                  {(filters.price[0] > filterOptions.price.min || 
                    filters.price[1] < filterOptions.price.max) && (
                    <Badge 
                      variant="outline" 
                      className="bg-primary/5 text-primary text-xs px-2 py-1 font-normal flex items-center gap-1"
                    >
                      £{formatPrice(filters.price[0])} - £{formatPrice(filters.price[1])}
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </div>
          
          <div className="space-y-4">
            {searchResults.map((result, index) => (
              <PropertyCard key={`${result.id}-${index}`} property={result} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
