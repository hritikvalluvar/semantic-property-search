import { useState, useEffect } from "react";
import { SearchResult } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Building, Hotel, CloudUpload, Brush, Sofa, Mountain, CheckCircle2, ImageIcon } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface PropertyCardProps {
  property: SearchResult;
}

export function PropertyCard({ property }: PropertyCardProps) {
  // States for image handling
  const [imageFilename, setImageFilename] = useState<string | null>(null);

  // Format numbers with commas
  const numberWithCommas = (x: number) => {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  // Check if images already exist on component mount
  useEffect(() => {
    const checkExistingImage = async () => {
      try {
        // Define the response type
        interface ImageCheckResponse {
          exists: boolean;
          filename: string | null;
        }
        
        // Make a request to check if the image has already been generated
        const response = await apiRequest<ImageCheckResponse>(`/api/property/image/${property.id}`);
        
        if (response && response.filename) {
          setImageFilename(response.filename);
        }
      } catch (error) {
        // Silently fail - we'll just show a placeholder
        console.log('No existing image found');
      }
    };

    checkExistingImage();
  }, [property.id]);

  return (
    <Card className="overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-1">
      <CardContent className="p-5">
        {/* Property Image Section */}
        <div className="mb-4 relative overflow-hidden rounded-lg bg-gray-100" style={{ height: '200px' }}>
          {imageFilename ? (
            <img 
              src={`/generated-images/${imageFilename}`} 
              alt={property.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center">
              <div className="flex flex-col items-center text-center">
                <ImageIcon className="h-12 w-12 text-gray-400 mb-2" />
                <span className="text-sm text-gray-500 mb-3 max-w-[80%]">
                  Property thumbnail not available
                </span>
              </div>
            </div>
          )}
        </div>
        <div className="flex justify-between items-start">
          <div className="flex flex-col">
            <h3 className="font-heading text-lg font-semibold text-gray-800">{property.title}</h3>
            {property.exactMatch && (
              <div className="flex items-center text-emerald-600 text-xs font-medium mt-1">
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                Exact match for your search criteria
              </div>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/40 px-2 py-1">
              Match score: {Math.round(property.score)}%
            </Badge>
            {property.distance !== undefined && (
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 px-2 py-1 flex items-center">
                <MapPin className="mr-1 h-3 w-3" />
                {property.distance} km away
              </Badge>
            )}
          </div>
        </div>
        
        <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
          <div className="flex items-center text-gray-600">
            <MapPin className="mr-1 h-4 w-4" />
            <span>{property.location}</span>
          </div>
          <div className="flex items-center text-gray-600">
            <Building className="mr-1 h-4 w-4" />
            <span>{property.type}</span>
          </div>
          <div className="flex items-center text-gray-600">
            <Hotel className="mr-1 h-4 w-4" />
            <span>{property.bedrooms} bed{property.bedrooms !== 1 ? 's' : ''}</span>
          </div>
          <div className="flex items-center text-gray-600">
            <CloudUpload className="mr-1 h-4 w-4" />
            <span>{property.bathrooms} bath{property.bathrooms !== 1 ? 's' : ''}</span>
          </div>
        </div>
        
        <div className="mt-4">
          <div className="flex justify-between items-baseline">
            <div className="text-2xl font-semibold text-primary">£{numberWithCommas(property.price)}</div>
            <div className="text-sm text-gray-500 flex items-center">
              <Brush className="mr-1 h-4 w-4" />
              <span>{property.style}</span>
            </div>
          </div>
        </div>
        
        <div className="mt-3 text-gray-600">{property.description}</div>
        
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge variant="outline" className="bg-gray-100 text-gray-700 flex items-center gap-1">
            <Mountain className="h-3 w-3" />
            {property.view} view
          </Badge>
          <Badge variant="outline" className="bg-gray-100 text-gray-700 flex items-center gap-1">
            <Sofa className="h-3 w-3" />
            {property.furnishing}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
