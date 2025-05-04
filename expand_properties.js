import fs from 'fs';
import { parse as parseCsv } from 'csv-parse/sync';

// Read the CSV file
const csvData = fs.readFileSync('semantic_property_listings.csv', 'utf8');
const properties = parseCsv(csvData, { columns: true, skip_empty_lines: true });

console.log(`Loaded ${properties.length} base properties from CSV`);

// Data for property generation
const locations = ['Chelsea', 'Wimbledon', 'Greenwich', 'Canary Wharf', 'Richmond', 'Camden', 
                  'Islington', 'Kensington', 'Hammersmith', 'Brixton', 'Hackney', 'Clapham', 
                  'Fulham', 'Notting Hill', 'Shoreditch', 'Battersea', 'Mayfair', 'Dulwich'];

const types = ['House', 'Flat', 'Bungalow', 'Penthouse', 'Townhouse', 'Studio', 'Cottage', 'Duplex', 'Mansion'];

const styles = ['Modern', 'Victorian', 'Contemporary', 'Traditional', 'Art Deco', 'Georgian', 
              'Minimalist', 'Industrial', 'Scandinavian', 'Rustic', 'Mediterranean', 'Colonial'];

const views = ['Park View', 'Garden View', 'River View', 'City View', 'Mountain View', 'No View', 
              'Sea View', 'Lake View', 'Forest View'];

const furnishings = ['Furnished', 'Unfurnished', 'Part-Furnished'];

// Create 100 additional properties
const expandedProperties = [...properties];
const totalPropertiesToCreate = 125 - properties.length;

console.log(`Generating ${totalPropertiesToCreate} additional properties...`);

for (let i = 0; i < totalPropertiesToCreate; i++) {
  const id = properties.length + i + 1;
  const location = locations[Math.floor(Math.random() * locations.length)];
  const type = types[Math.floor(Math.random() * types.length)];
  const style = styles[Math.floor(Math.random() * styles.length)];
  const bedrooms = Math.floor(Math.random() * 6) + 1;
  const bathrooms = Math.floor(Math.random() * 4) + 1;
  const price = Math.floor(Math.random() * 2000000) + 300000;
  const view = views[Math.floor(Math.random() * views.length)];
  const furnishing = furnishings[Math.floor(Math.random() * furnishings.length)];
  
  // Create a title
  const title = `${style} ${bedrooms}-bedroom ${type} in ${location}`;
  
  // Create a comprehensive description
  const description = `A ${style.toLowerCase()} ${type.toLowerCase()} located in ${location}, ` +
                    `featuring ${bedrooms} bedroom${bedrooms > 1 ? 's' : ''}, ` +
                    `${bathrooms} bathroom${bathrooms > 1 ? 's' : ''}, with a ${view.toLowerCase()}, ` +
                    `and is ${furnishing.toLowerCase()}. This property offers a great blend of style and comfort ` +
                    `with modern amenities and an ideal location.`;
  
  const property = {
    id,
    title,
    description,
    type,
    style,
    location,
    bedrooms,
    bathrooms,
    price,
    view,
    furnishing
  };
  
  expandedProperties.push(property);
}

// Create the CSV header and content
const header = 'id,title,description,type,style,location,bedrooms,bathrooms,price,view,furnishing\n';
const csvRows = expandedProperties.map(property => {
  return `${property.id},"${property.title}","${property.description}",${property.type},${property.style},${property.location},${property.bedrooms},${property.bathrooms},${property.price},${property.view},${property.furnishing}`;
});

const updatedCsvContent = header + csvRows.join('\n');

// Create a backup of the original file
fs.copyFileSync('semantic_property_listings.csv', 'semantic_property_listings.backup.csv');
console.log('Created backup of original CSV file');

// Write the expanded properties to the CSV file
fs.writeFileSync('semantic_property_listings.csv', updatedCsvContent);
console.log(`Successfully expanded property listings to ${expandedProperties.length} properties`);