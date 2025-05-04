import { useState, useEffect } from "react";
import { FilterState, FilterOptions } from "@/lib/types";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { RangeSlider } from "@/components/ui/range-slider";

interface PropertyFiltersProps {
  filterOptions: FilterOptions;
  filters: FilterState;
  toggleFilter: (filterType: string, value: string) => void;
  updateRangeFilter: (filterType: string, index: number, value: number) => void;
  resetFilters: () => void;
  isOpen: boolean;
}

export function PropertyFilters({
  filterOptions,
  filters,
  toggleFilter,
  updateRangeFilter,
  resetFilters,
  isOpen
}: PropertyFiltersProps) {
  // Track filter interactions
  const trackFilterInteraction = (filterType: string, value: string, selected: boolean) => {
    // Call the toggle function
    toggleFilter(filterType, value);
  };

  // Format numbers with commas
  const numberWithCommas = (x: number) => {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };
  
  // Get active filter count per section
  const getActiveCount = (filterType: keyof FilterState): number => {
    if (Array.isArray(filters[filterType])) {
      return (filters[filterType] as string[]).length;
    }
    return 0;
  };

  return (
    <aside 
      className={`bg-white shadow-md md:w-80 lg:w-96 transition-all duration-300 ease-in-out ${isOpen ? 'block' : 'hidden md:block'}`}
    >
      <div className="p-4 space-y-4 h-full overflow-auto">
        <div className="hidden md:block">
          <h1 className="font-heading font-bold text-xl text-primary mb-6">🏡 Semantic Property Search</h1>
        </div>
        
        <div className="border-b pb-2">
          <h2 className="font-heading font-semibold text-gray-800 flex items-center text-lg">
            <i className="ri-filter-3-line mr-2 text-primary"></i> Filters
          </h2>
        </div>
        
        {/* Filter Groups */}
        <div className="space-y-5">
          {/* Property Type Filter */}
          <div>
            <Label className="font-medium text-gray-700 block mb-2">
              Property Type
              {getActiveCount('type') > 0 && (
                <Badge variant="secondary" className="ml-2 bg-primary/10 text-primary">
                  {getActiveCount('type')}
                </Badge>
              )}
            </Label>
            
            <div className="flex flex-wrap gap-2">
              {filterOptions.types.map((type) => (
                <button 
                  key={type}
                  onClick={() => trackFilterInteraction('type', type, !filters.type.includes(type))}
                  className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                    filters.type.includes(type) 
                      ? 'bg-primary/10 text-primary border-primary/40' 
                      : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
          
          {/* Property Style Filter */}
          <div>
            <Label className="font-medium text-gray-700 block mb-2">
              Style
              {getActiveCount('style') > 0 && (
                <Badge variant="secondary" className="ml-2 bg-primary/10 text-primary">
                  {getActiveCount('style')}
                </Badge>
              )}
            </Label>
            
            <div className="flex flex-wrap gap-2">
              {filterOptions.styles.map((style) => (
                <button 
                  key={style}
                  onClick={() => trackFilterInteraction('style', style, !filters.style.includes(style))}
                  className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                    filters.style.includes(style) 
                      ? 'bg-primary/10 text-primary border-primary/40' 
                      : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                  }`}
                >
                  {style}
                </button>
              ))}
            </div>
          </div>
          
          {/* Location Filter */}
          <div>
            <Label className="font-medium text-gray-700 block mb-2">
              Location
              {getActiveCount('location') > 0 && (
                <Badge variant="secondary" className="ml-2 bg-primary/10 text-primary">
                  {getActiveCount('location')}
                </Badge>
              )}
            </Label>
            
            <div className="flex flex-wrap gap-2">
              {filterOptions.locations.map((location) => (
                <button 
                  key={location}
                  onClick={() => trackFilterInteraction('location', location, !filters.location.includes(location))}
                  className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                    filters.location.includes(location) 
                      ? 'bg-primary/10 text-primary border-primary/40' 
                      : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                  }`}
                >
                  {location}
                </button>
              ))}
            </div>
          </div>
          
          {/* Bedrooms Range */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <Label className="font-medium text-gray-700">Bedrooms</Label>
              <span className="text-sm text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
                {filters.bedrooms[0]} - {filters.bedrooms[1]}
              </span>
            </div>
            <div className="px-1 mb-6 mt-4">
              <RangeSlider
                min={filterOptions.bedrooms.min}
                max={filterOptions.bedrooms.max}
                step={1}
                values={[filters.bedrooms[0], filters.bedrooms[1]]}
                onChange={([min, max]) => {
                  updateRangeFilter('bedrooms', 0, min);
                  updateRangeFilter('bedrooms', 1, max);
                }}
              />
            </div>
          </div>
          
          {/* Bathrooms Range */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <Label className="font-medium text-gray-700">Bathrooms</Label>
              <span className="text-sm text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
                {filters.bathrooms[0]} - {filters.bathrooms[1]}
              </span>
            </div>
            <div className="px-1 mb-6 mt-4">
              <RangeSlider
                min={filterOptions.bathrooms.min}
                max={filterOptions.bathrooms.max}
                step={1}
                values={[filters.bathrooms[0], filters.bathrooms[1]]}
                onChange={([min, max]) => {
                  updateRangeFilter('bathrooms', 0, min);
                  updateRangeFilter('bathrooms', 1, max);
                }}
              />
            </div>
          </div>
          
          {/* Price Range */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <Label className="font-medium text-gray-700">Price</Label>
              <span className="text-sm text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
                £{numberWithCommas(filters.price[0])} - £{numberWithCommas(filters.price[1])}
              </span>
            </div>
            <div className="px-1 mb-6 mt-4">
              <RangeSlider
                min={filterOptions.price.min}
                max={filterOptions.price.max}
                step={50000}
                values={[filters.price[0], filters.price[1]]}
                onChange={([min, max]) => {
                  updateRangeFilter('price', 0, min);
                  updateRangeFilter('price', 1, max);
                }}
                formatValue={(value) => `£${numberWithCommas(value)}`}
              />
            </div>
          </div>
          
          {/* View Filter */}
          <div>
            <Label className="font-medium text-gray-700 block mb-2">
              View
              {getActiveCount('view') > 0 && (
                <Badge variant="secondary" className="ml-2 bg-primary/10 text-primary">
                  {getActiveCount('view')}
                </Badge>
              )}
            </Label>
            
            <div className="flex flex-wrap gap-2">
              {filterOptions.views.map((view) => (
                <button 
                  key={view}
                  onClick={() => trackFilterInteraction('view', view, !filters.view.includes(view))}
                  className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                    filters.view.includes(view) 
                      ? 'bg-primary/10 text-primary border-primary/40' 
                      : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                  }`}
                >
                  {view}
                </button>
              ))}
            </div>
          </div>
          
          {/* Furnishing Filter */}
          <div>
            <Label className="font-medium text-gray-700 block mb-2">
              Furnishing
              {getActiveCount('furnishing') > 0 && (
                <Badge variant="secondary" className="ml-2 bg-primary/10 text-primary">
                  {getActiveCount('furnishing')}
                </Badge>
              )}
            </Label>
            
            <div className="flex flex-wrap gap-2">
              {filterOptions.furnishings.map((furnishing) => (
                <button 
                  key={furnishing}
                  onClick={() => trackFilterInteraction('furnishing', furnishing, !filters.furnishing.includes(furnishing))}
                  className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                    filters.furnishing.includes(furnishing) 
                      ? 'bg-primary/10 text-primary border-primary/40' 
                      : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                  }`}
                >
                  {furnishing}
                </button>
              ))}
            </div>
          </div>
        </div>
        
        {/* Reset Filters Button */}
        <div className="pt-4 space-y-2">
          <Button 
            onClick={resetFilters} 
            variant="outline"
            className="w-full"
          >
            <i className="ri-refresh-line mr-2"></i> Reset Filters
          </Button>
          

        </div>
      </div>
    </aside>
  );
}
