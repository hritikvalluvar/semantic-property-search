import { useState, useEffect } from "react";
import { FilterState, FilterOptions } from "@/lib/types";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  // Format numbers with commas
  const numberWithCommas = (x: number) => {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
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
            <Label className="font-medium text-gray-700 block mb-2">Property Type</Label>
            <div className="flex flex-wrap gap-2">
              {filterOptions.types.map((type) => (
                <button 
                  key={type}
                  onClick={() => toggleFilter('type', type)}
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
            <Label className="font-medium text-gray-700 block mb-2">Style</Label>
            <div className="flex flex-wrap gap-2">
              {filterOptions.styles.map((style) => (
                <button 
                  key={style}
                  onClick={() => toggleFilter('style', style)}
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
            <Label className="font-medium text-gray-700 block mb-2">Location</Label>
            <Select 
              value={filters.location.length ? filters.location.join(',') : ""}
              onValueChange={(value) => {
                const locations = value ? value.split(',') : [];
                const newFilters = { ...filters, location: locations };
                const updatedLocations = locations.filter(loc => filterOptions.locations.includes(loc));
                toggleFilter('location', updatedLocations.join(','));
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select locations" />
              </SelectTrigger>
              <SelectContent>
                {filterOptions.locations.map((location) => (
                  <SelectItem key={location} value={location}>
                    {location}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Bedrooms Range */}
          <div>
            <Label className="font-medium text-gray-700 block mb-2">
              Bedrooms: {filters.bedrooms[0]} - {filters.bedrooms[1]}
            </Label>
            <div className="px-1 mb-6">
              <Slider
                min={filterOptions.bedrooms.min}
                max={filterOptions.bedrooms.max}
                step={1}
                value={[filters.bedrooms[0], filters.bedrooms[1]]}
                onValueChange={([min, max]) => {
                  updateRangeFilter('bedrooms', 0, min);
                  updateRangeFilter('bedrooms', 1, max);
                }}
              />
            </div>
          </div>
          
          {/* Bathrooms Range */}
          <div>
            <Label className="font-medium text-gray-700 block mb-2">
              Bathrooms: {filters.bathrooms[0]} - {filters.bathrooms[1]}
            </Label>
            <div className="px-1 mb-6">
              <Slider
                min={filterOptions.bathrooms.min}
                max={filterOptions.bathrooms.max}
                step={1}
                value={[filters.bathrooms[0], filters.bathrooms[1]]}
                onValueChange={([min, max]) => {
                  updateRangeFilter('bathrooms', 0, min);
                  updateRangeFilter('bathrooms', 1, max);
                }}
              />
            </div>
          </div>
          
          {/* Price Range */}
          <div>
            <Label className="font-medium text-gray-700 block mb-2">
              Price: £{numberWithCommas(filters.price[0])} - £{numberWithCommas(filters.price[1])}
            </Label>
            <div className="px-1 mb-6">
              <Slider
                min={filterOptions.price.min}
                max={filterOptions.price.max}
                step={50000}
                value={[filters.price[0], filters.price[1]]}
                onValueChange={([min, max]) => {
                  updateRangeFilter('price', 0, min);
                  updateRangeFilter('price', 1, max);
                }}
              />
            </div>
          </div>
          
          {/* View Filter */}
          <div>
            <Label className="font-medium text-gray-700 block mb-2">View</Label>
            <div className="flex flex-wrap gap-2">
              {filterOptions.views.map((view) => (
                <button 
                  key={view}
                  onClick={() => toggleFilter('view', view)}
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
            <Label className="font-medium text-gray-700 block mb-2">Furnishing</Label>
            <div className="flex flex-wrap gap-2">
              {filterOptions.furnishings.map((furnishing) => (
                <button 
                  key={furnishing}
                  onClick={() => toggleFilter('furnishing', furnishing)}
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
        <div className="pt-4">
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
