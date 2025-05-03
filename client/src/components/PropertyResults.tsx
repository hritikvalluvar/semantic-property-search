import { useState } from "react";
import { SearchResult } from "@/lib/types";
import { PropertyCard } from "./PropertyCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface PropertyResultsProps {
  searchResults: SearchResult[];
  isSearching: boolean;
  hasSearched: boolean;
  resetFilters: () => void;
}

export function PropertyResults({
  searchResults,
  isSearching,
  hasSearched,
  resetFilters
}: PropertyResultsProps) {
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
          <h2 className="font-heading text-xl font-semibold text-gray-800 mb-4 flex items-center">
            <i className="ri-home-4-line mr-2 text-primary"></i>
            Top Matching Properties
            <span className="ml-2 text-sm font-normal text-gray-500">({searchResults.length} results)</span>
          </h2>
          
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
