import { SearchResult } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Building, Hotel, CloudUpload, Brush, Sofa, Mountain } from "lucide-react";

interface PropertyCardProps {
  property: SearchResult;
}

export function PropertyCard({ property }: PropertyCardProps) {
  // Format numbers with commas
  const numberWithCommas = (x: number) => {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  return (
    <Card className="overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-1">
      <CardContent className="p-5">
        <div className="flex justify-between items-start">
          <h3 className="font-heading text-lg font-semibold text-gray-800">{property.title}</h3>
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/40 px-2 py-1">
            Match score: {(property.score * 100).toFixed(1)}%
          </Badge>
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
