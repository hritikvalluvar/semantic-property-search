import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PropertyFilters } from "./PropertyFilters";
import { PropertyResults } from "./PropertyResults";
import { apiRequest } from "@/lib/queryClient";
import { PropertyListing, SearchResult, FilterState, FilterOptions } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function PropertySearch() {
  const [queryText, setQueryText] = useState("A nice, simple house near park");
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);
  const [filters, setFilters] = useState<FilterState | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(window.innerWidth >= 768);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [filteredResults, setFilteredResults] = useState<SearchResult[]>([]);
  const { toast } = useToast();

  const sampleQueries = [
    "A modern 4-bedroom house with a park view",
    "Victorian flat in Wimbledon",
    "5-bedroom bungalow near a river",
    "Cozy townhouse with city views",
    "Furnished property with a garden view",
    "Contemporary flat with 2 bathrooms"
  ];

  // Fetch filter options
  const { data: filterData, isLoading: isLoadingFilters } = useQuery({
    queryKey: ['/api/property/filters'],
    enabled: true
  });

  useEffect(() => {
    if (filterData) {
      setFilterOptions(filterData);
      
      // Initialize filters with default values
      setFilters({
        type: [],
        style: [],
        location: [],
        bedrooms: [filterData.bedrooms.min, filterData.bedrooms.max],
        bathrooms: [filterData.bathrooms.min, filterData.bathrooms.max],
        price: [filterData.price.min, filterData.price.max],
        view: [],
        furnishing: []
      });
    }
  }, [filterData]);

  // Search mutation
  const { mutate: searchProperties, isPending: isSearching } = useMutation({
    mutationFn: async (query: string) => {
      const response = await apiRequest('POST', '/api/property/search', { query });
      return response.json();
    },
    onSuccess: (data: SearchResult[]) => {
      setSearchResults(data);
      applyFilters(data);
    },
    onError: (error) => {
      toast({
        title: "Search failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Handle window resize for responsive filter sidebar
  useEffect(() => {
    const handleResize = () => {
      setFiltersOpen(window.innerWidth >= 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Apply filters to search results
  const applyFilters = (results: SearchResult[] = searchResults) => {
    if (!filters) return;
    
    const filtered = results.filter(item => {
      // Type filter
      if (filters.type.length > 0 && !filters.type.includes(item.type)) {
        return false;
      }
      
      // Style filter
      if (filters.style.length > 0 && !filters.style.includes(item.style)) {
        return false;
      }
      
      // Location filter
      if (filters.location.length > 0 && !filters.location.includes(item.location)) {
        return false;
      }
      
      // Bedrooms range
      if (item.bedrooms < filters.bedrooms[0] || item.bedrooms > filters.bedrooms[1]) {
        return false;
      }
      
      // Bathrooms range
      if (item.bathrooms < filters.bathrooms[0] || item.bathrooms > filters.bathrooms[1]) {
        return false;
      }
      
      // Price range
      if (item.price < filters.price[0] || item.price > filters.price[1]) {
        return false;
      }
      
      // View filter
      if (filters.view.length > 0 && !filters.view.includes(item.view)) {
        return false;
      }
      
      // Furnishing filter
      if (filters.furnishing.length > 0 && !filters.furnishing.includes(item.furnishing)) {
        return false;
      }
      
      return true;
    });
    
    setFilteredResults(filtered);
  };

  // Toggle a filter value
  const toggleFilter = (filterType: string, value: string) => {
    if (!filters) return;
    
    const updatedFilters = { ...filters };
    const currentValues = updatedFilters[filterType as keyof FilterState] as string[];
    
    if (Array.isArray(currentValues)) {
      if (currentValues.includes(value)) {
        updatedFilters[filterType as keyof FilterState] = currentValues.filter(item => item !== value) as any;
      } else {
        updatedFilters[filterType as keyof FilterState] = [...currentValues, value] as any;
      }
    }
    
    setFilters(updatedFilters);
    applyFilters();
  };

  // Update range filter
  const updateRangeFilter = (filterType: string, index: number, value: number) => {
    if (!filters) return;
    
    const updatedFilters = { ...filters };
    const currentRange = [...updatedFilters[filterType as keyof FilterState] as number[]];
    currentRange[index] = value;
    updatedFilters[filterType as keyof FilterState] = currentRange as any;
    
    setFilters(updatedFilters);
    applyFilters();
  };

  // Reset all filters to default values
  const resetFilters = () => {
    if (!filterOptions) return;
    
    setFilters({
      type: [],
      style: [],
      location: [],
      bedrooms: [filterOptions.bedrooms.min, filterOptions.bedrooms.max],
      bathrooms: [filterOptions.bathrooms.min, filterOptions.bathrooms.max],
      price: [filterOptions.price.min, filterOptions.price.max],
      view: [],
      furnishing: []
    });
    
    applyFilters();
  };

  // Perform search
  const performSearch = () => {
    searchProperties(queryText);
  };

  // Handle sample query selection
  const selectSampleQuery = (query: string) => {
    setQueryText(query);
    searchProperties(query);
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Mobile header with sidebar toggle */}
      <div className="md:hidden p-4 bg-white border-b shadow-sm flex justify-between items-center">
        <h1 className="font-heading font-bold text-xl text-primary">🏡 Semantic Property Search</h1>
        <Button 
          onClick={() => setFiltersOpen(!filtersOpen)}
          variant="default"
          className="flex items-center"
        >
          <i className="ri-filter-3-line mr-1"></i> Filters
        </Button>
      </div>

      {/* Filters sidebar */}
      {filterOptions && filters && (
        <PropertyFilters 
          filterOptions={filterOptions}
          filters={filters}
          toggleFilter={toggleFilter}
          updateRangeFilter={updateRangeFilter}
          resetFilters={resetFilters}
          isOpen={filtersOpen}
        />
      )}

      {/* Main content */}
      <main className="flex-1 p-4 md:p-6 overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Search section */}
          <div className="bg-white rounded-lg shadow-md p-5">
            <h2 className="font-heading text-xl md:text-2xl font-semibold mb-4 text-gray-800">Search for your ideal property</h2>
            <div className="relative">
              <div className="flex items-center">
                <div className="relative flex-1">
                  <Input
                    type="text"
                    value={queryText}
                    onChange={(e) => setQueryText(e.target.value)}
                    placeholder="Describe your dream property..."
                    className="w-full pl-10 pr-4 py-6 rounded-l-lg"
                  />
                  <Search className="absolute left-3 top-3 text-gray-400" />
                </div>
                <Button
                  onClick={performSearch}
                  disabled={isSearching}
                  className="h-[42px] rounded-l-none"
                >
                  {isSearching ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Searching...
                    </>
                  ) : (
                    "Search"
                  )}
                </Button>
              </div>
            </div>

            {/* Sample searches */}
            <div className="mt-4">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Sample searches:</h3>
              <div className="flex flex-wrap gap-2">
                {sampleQueries.map((query, index) => (
                  <button
                    key={index}
                    onClick={() => selectSampleQuery(query)}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm px-3 py-1.5 rounded-full transition-colors"
                  >
                    {query}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Results section */}
          <PropertyResults
            searchResults={filteredResults}
            isSearching={isSearching}
            hasSearched={searchResults.length > 0}
            resetFilters={resetFilters}
          />
        </div>
      </main>
    </div>
  );
}
