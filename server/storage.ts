import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse';
import { 
  Property, 
  FilterOptions, 
  PropertyEmbedding,
  User,
  InsertUser,
  PropertyWithCoordinates,
  Coordinates
} from '@shared/schema';
import { getEmbedding } from './services/openai';
import { upsertVectors } from './services/pinecone';

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  loadPropertyDataFromCSV(): Promise<void>;
  getFilterOptions(): Promise<FilterOptions>;
  getPropertyById(id: number): Promise<Property | undefined>;
  getPropertiesByIds(ids: string[]): Promise<Property[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private properties: Map<string, PropertyWithCoordinates>;
  private propertyEmbeddings: Map<string, number[]>;
  currentId: number;

  constructor() {
    this.users = new Map();
    this.properties = new Map();
    this.propertyEmbeddings = new Map();
    this.currentId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async loadPropertyDataFromCSV(): Promise<void> {
    // If data is already loaded, return
    if (this.properties.size > 0) {
      return;
    }

    // Check for production or development environment
    const isProd = process.env.NODE_ENV === 'production';
    
    // Path to CSV file - for production, we'll use mock data
    // In Vercel serverless functions, file system access is limited, so we use mock data in production
    const csvFilePath = path.resolve(process.cwd(), 'semantic_property_listings.csv');

    // In production or if file doesn't exist, use mock data
    if (isProd || !fs.existsSync(csvFilePath)) {
      console.log(`Using mock data (Production: ${isProd}, File exists: ${fs.existsSync(csvFilePath)})`);
      // Load mock data instead
      await this.loadMockPropertyData();
      return;
    }
    
    console.log(`Loading property data from CSV: ${csvFilePath}`);

    // Parse CSV
    const parser = fs
      .createReadStream(csvFilePath)
      .pipe(parse({
        columns: true,
        skip_empty_lines: true
      }));

    const properties: Property[] = [];
    const embeddingPromises: Promise<PropertyEmbedding | null>[] = [];
    
    // Import geocoding service
    const { getCoordinates } = await import('./services/geocoding');
    
    // Process each row
    for await (const row of parser) {
      // Get coordinates for the location
      const coordinates = getCoordinates(row.location);
      
      const property: PropertyWithCoordinates = {
        id: parseInt(row.id),
        title: row.title,
        description: row.description,
        location: row.location,
        type: row.type,
        style: row.style,
        bedrooms: parseInt(row.bedrooms),
        bathrooms: parseInt(row.bathrooms),
        price: parseInt(row.price),
        view: row.view,
        furnishing: row.furnishing,
        embedding: row.embedding || null,
        coordinates  // Add coordinates to the property
      };
      
      this.properties.set(property.id.toString(), property);
      properties.push(property);
      
      // If embedding exists in CSV, parse it
      if (property.embedding) {
        try {
          const embeddingArray = JSON.parse(property.embedding);
          this.propertyEmbeddings.set(property.id.toString(), embeddingArray);
        } catch (error) {
          console.error(`Error parsing embedding for property ${property.id}: ${error}`);
        }
      } else {
        // Generate embedding if it doesn't exist
        const textToEmbed = `${property.title}. ${property.description}. ${property.type} in ${property.location}. ${property.style} style. ${property.bedrooms} bedrooms. ${property.bathrooms} bathrooms. ${property.view} view. ${property.furnishing}.`;
        
        const promise = getEmbedding(textToEmbed)
          .then(embedding => {
            this.propertyEmbeddings.set(property.id.toString(), embedding);
            const propertyEmbedding: PropertyEmbedding = {
              id: property.id.toString(),
              embedding
            };
            return propertyEmbedding;
          })
          .catch(error => {
            console.error(`Error generating embedding for property ${property.id}: ${error}`);
            return null;
          });
        
        embeddingPromises.push(promise);
      }
    }
    
    // Wait for all embedding promises to resolve
    const embeddings = await Promise.all(embeddingPromises);
    const validEmbeddings = embeddings.filter((e): e is PropertyEmbedding => e !== null);
    
    // Upsert vectors into Pinecone
    if (validEmbeddings.length > 0) {
      try {
        console.log(`Upserting ${validEmbeddings.length} vectors into Pinecone index`);
        await upsertVectors(validEmbeddings);
        console.log(`Successfully upserted vectors into Pinecone index`);
      } catch (error) {
        console.error("Error upserting vectors into Pinecone:", error);
      }
    } else {
      console.log('No new embeddings to upsert into Pinecone');
    }
  }
  
  private async loadMockPropertyData(): Promise<void> {
    // Import geocoding service
    const { getCoordinates } = await import('./services/geocoding');
    
    // Data for property generation - we'll generate 125 properties
    const locations = ['Chelsea', 'Wimbledon', 'Greenwich', 'Canary Wharf', 'Richmond', 'Camden', 
                      'Islington', 'Kensington', 'Hammersmith', 'Brixton', 'Hackney', 'Clapham', 
                      'Fulham', 'Notting Hill', 'Shoreditch', 'Battersea', 'Mayfair', 'Dulwich'];
    
    const types = ['House', 'Flat', 'Bungalow', 'Penthouse', 'Townhouse', 'Studio', 'Cottage', 'Duplex', 'Mansion'];
    
    const styles = ['Modern', 'Victorian', 'Contemporary', 'Traditional', 'Art Deco', 'Georgian', 
                   'Minimalist', 'Industrial', 'Scandinavian', 'Rustic', 'Mediterranean', 'Colonial'];
    
    const views = ['Park View', 'Garden View', 'River View', 'City View', 'Mountain View', 'No View', 
                   'Sea View', 'Lake View', 'Forest View'];
    
    const furnishings = ['Furnished', 'Unfurnished', 'Part-Furnished'];
    
    // Generate additional properties (125 total)
    const mockProperties: PropertyWithCoordinates[] = [];
    
    console.log('Generating 125 properties...');
    
    for (let i = 0; i < 125; i++) {
      const id = i + 1;
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
      
      const coordinates = getCoordinates(location);
      
      const property: PropertyWithCoordinates = {
        id,
        title,
        description,
        location,
        type,
        style,
        bedrooms,
        bathrooms,
        price,
        view,
        furnishing,
        embedding: null,
        coordinates
      };
      
      mockProperties.push(property);
    }
    
    console.log(`Generated ${mockProperties.length} properties`);
    
    // Store mock properties and generate their embeddings
    const embeddingPromises: Promise<PropertyEmbedding | null>[] = [];
    
    mockProperties.forEach(property => {
      this.properties.set(property.id.toString(), property);
      
      const textToEmbed = `${property.title}. ${property.description}. ${property.type} in ${property.location}. ${property.style} style. ${property.bedrooms} bedrooms. ${property.bathrooms} bathrooms. ${property.view} view. ${property.furnishing}.`;
      
      const promise = getEmbedding(textToEmbed)
        .then(embedding => {
          this.propertyEmbeddings.set(property.id.toString(), embedding);
          return { id: property.id.toString(), embedding };
        })
        .catch(error => {
          console.error(`Error generating embedding for property ${property.id}: ${error}`);
          return null;
        });
      
      embeddingPromises.push(promise);
    });
    
    // Wait for all embedding promises to resolve
    const embeddings = await Promise.all(embeddingPromises);
    const validEmbeddings = embeddings.filter((e): e is PropertyEmbedding => e !== null);
    
    // Upsert vectors into Pinecone
    if (validEmbeddings.length > 0) {
      try {
        console.log(`Upserting ${validEmbeddings.length} vectors into Pinecone index`);
        await upsertVectors(validEmbeddings);
        console.log(`Successfully upserted vectors into Pinecone index`);
      } catch (error) {
        console.error("Error upserting vectors into Pinecone:", error);
      }
    }
    
    // Generate images for all properties
    await this.preGeneratePropertyImages();
  }

  async getFilterOptions(): Promise<FilterOptions> {
    const properties = Array.from(this.properties.values());
    
    // Extract unique values and min/max for filter options
    const types = Array.from(new Set(properties.map(p => p.type)));
    const styles = Array.from(new Set(properties.map(p => p.style)));
    const locations = Array.from(new Set(properties.map(p => p.location)));
    const views = Array.from(new Set(properties.map(p => p.view)));
    const furnishings = Array.from(new Set(properties.map(p => p.furnishing)));

    const minBedrooms = Math.min(...properties.map(p => p.bedrooms));
    const maxBedrooms = Math.max(...properties.map(p => p.bedrooms));
    const minBathrooms = Math.min(...properties.map(p => p.bathrooms));
    const maxBathrooms = Math.max(...properties.map(p => p.bathrooms));
    const minPrice = Math.min(...properties.map(p => p.price));
    const maxPrice = Math.max(...properties.map(p => p.price));

    return {
      types,
      styles,
      locations,
      bedrooms: { min: minBedrooms, max: maxBedrooms },
      bathrooms: { min: minBathrooms, max: maxBathrooms },
      price: { min: minPrice, max: maxPrice },
      views,
      furnishings
    };
  }

  async getPropertyById(id: number): Promise<Property | undefined> {
    return this.properties.get(id.toString());
  }

  async getPropertiesByIds(ids: string[]): Promise<Property[]> {
    return ids
      .map(id => this.properties.get(id))
      .filter(p => p !== undefined) as Property[];
  }
  
  /**
   * Pre-generate images for all properties to avoid on-demand generation
   */
  private async preGeneratePropertyImages(): Promise<void> {
    try {
      // Import necessary functions from image-generation service
      const { generatePropertyImage, getExistingPropertyImage } = await import('./services/image-generation');
      
      // Create images directory if it doesn't exist
      const imagesDir = path.join(process.cwd(), "client", "public", "generated-images");
      if (!fs.existsSync(imagesDir)) {
        fs.mkdirSync(imagesDir, { recursive: true });
      }
      
      // Get all properties
      const properties = Array.from(this.properties.values());
      console.log(`Pre-generating images for ${properties.length} properties...`);
      
      // Create a preset directory to store type-based images
      const presetImagesDir = path.join(process.cwd(), "client", "public", "preset-images");
      if (!fs.existsSync(presetImagesDir)) {
        fs.mkdirSync(presetImagesDir, { recursive: true });
      }
      
      // Map to track image generation by property type
      const propertyTypeImages = new Map<string, string>();
      
      // Generate or use existing images for all properties
      let generatedCount = 0;
      let existingCount = 0;
      let errorCount = 0;
      
      // Process each property - limit to 10 actual generations to avoid rate limits
      for (const property of properties) {
        try {
          // Check if image already exists
          const existingImage = getExistingPropertyImage(property.id);
          if (existingImage) {
            console.log(`Image already exists for property ${property.id}: ${existingImage}`);
            existingCount++;
            continue;
          }
          
          // Check if we've already generated an image for this property type
          const propertyType = property.type;
          let filename: string;
          
          if (propertyTypeImages.has(propertyType) && generatedCount >= 10) {
            // Use the existing image for this property type
            const sourceFilename = propertyTypeImages.get(propertyType)!;
            const sourceFilePath = path.join(imagesDir, sourceFilename);
            
            // Create a new filename for this property
            filename = `property-${property.id}-${Date.now()}.png`;
            const targetFilePath = path.join(imagesDir, filename);
            
            // Copy the file
            fs.copyFileSync(sourceFilePath, targetFilePath);
            console.log(`Reused image of type ${propertyType} for property ${property.id}`);
          } else if (generatedCount < 10) {
            // Generate a new image for this property (limited to 10 generations)
            const result = await generatePropertyImage(property);
            filename = result.filename;
            
            // Remember this image for this property type
            propertyTypeImages.set(propertyType, filename);
            generatedCount++;
            
            console.log(`Generated image for property ${property.id} (${generatedCount}/10 generated)`);
          } else {
            // Create a simple placeholder file with property information
            filename = `property-${property.id}-${Date.now()}.png`;
            const placeholderPath = path.join(imagesDir, filename);
            
            // Since we can't use canvas in Node.js without additional packages,
            // we'll create a simple placeholder text file
            const placeholderText = 
              `Property Placeholder\n` +
              `ID: ${property.id}\n` +
              `Type: ${property.type}\n` +
              `Location: ${property.location}\n` +
              `This is a placeholder image until actual property images are generated.`;
            
            fs.writeFileSync(placeholderPath, placeholderText);
            
            console.log(`Created placeholder file for property ${property.id}`);
          }
        } catch (error) {
          console.error(`Error generating image for property ${property.id}:`, error);
          errorCount++;
        }
      }
      
      console.log(`Image pre-generation complete:`);
      console.log(`- Generated: ${generatedCount}`);
      console.log(`- Existing: ${existingCount}`);
      console.log(`- Errors: ${errorCount}`);
      console.log(`- Total properties: ${properties.length}`);
      
    } catch (error) {
      console.error('Error in preGeneratePropertyImages:', error);
    }
  }

  /**
   * Expand property dataset to create 125 properties total
   * Uses existing CSV data as a base and augments with variations
   */
  private async expandPropertyDataset(): Promise<void> {
    // Parse the base CSV data first
    const csvFilePath = path.resolve(process.cwd(), 'semantic_property_listings.csv');
    const parser = fs
      .createReadStream(csvFilePath)
      .pipe(parse({
        columns: true,
        skip_empty_lines: true
      }));
      
    // Load the base properties
    const baseProperties: PropertyWithCoordinates[] = [];
    const { getCoordinates } = await import('./services/geocoding');
    
    // Process each row from the CSV
    for await (const row of parser) {
      const coordinates = getCoordinates(row.location);
      
      const property: PropertyWithCoordinates = {
        id: parseInt(row.id),
        title: row.title,
        description: row.description,
        location: row.location,
        type: row.type,
        style: row.style,
        bedrooms: parseInt(row.bedrooms),
        bathrooms: parseInt(row.bathrooms),
        price: parseInt(row.price),
        view: row.view,
        furnishing: row.furnishing,
        embedding: null,
        coordinates  // Add coordinates to the property
      };
      
      baseProperties.push(property);
      this.properties.set(property.id.toString(), property);
    }
    
    console.log(`Loaded ${baseProperties.length} base properties from CSV`);
    
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
    
    // Generate additional properties to reach 125 total
    const additionalPropertiesNeeded = 125 - baseProperties.length;
    console.log(`Generating ${additionalPropertiesNeeded} additional properties`);
    
    const embeddingPromises: Promise<PropertyEmbedding | null>[] = [];
    
    for (let i = 0; i < additionalPropertiesNeeded; i++) {
      const id = baseProperties.length + i + 1;
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
      
      const coordinates = getCoordinates(location);
      
      const property: PropertyWithCoordinates = {
        id,
        title,
        description,
        location,
        type,
        style,
        bedrooms,
        bathrooms,
        price,
        view,
        furnishing,
        embedding: null,
        coordinates
      };
      
      // Store the property
      this.properties.set(property.id.toString(), property);
      
      // Generate embedding
      const textToEmbed = `${property.title}. ${property.description}. ${property.type} in ${property.location}. ` +
                        `${property.style} style. ${property.bedrooms} bedrooms. ${property.bathrooms} bathrooms. ` +
                        `${property.view} view. ${property.furnishing}.`;
      
      // Create embedding promise
      const promise = getEmbedding(textToEmbed)
        .then(embedding => {
          this.propertyEmbeddings.set(property.id.toString(), embedding);
          return { id: property.id.toString(), embedding };
        })
        .catch(error => {
          console.error(`Error generating embedding for property ${property.id}: ${error}`);
          return null;
        });
      
      embeddingPromises.push(promise);
      
      // For throttling API calls if needed
      if (i % 10 === 0 && i > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // Wait for all embedding promises to resolve
    const embeddings = await Promise.all(embeddingPromises);
    const validEmbeddings = embeddings.filter((e): e is PropertyEmbedding => e !== null);
    
    // Upsert vectors into Pinecone
    if (validEmbeddings.length > 0) {
      try {
        console.log(`Upserting ${validEmbeddings.length} vectors into Pinecone index`);
        await upsertVectors(validEmbeddings);
        console.log(`Successfully upserted vectors into Pinecone index`);
      } catch (error) {
        console.error("Error upserting vectors into Pinecone:", error);
      }
    }
    
    console.log(`Expanded dataset to ${this.properties.size} properties total`);

    // Pre-generate property images
    await this.preGeneratePropertyImages();
  }
  

}

export const storage = new MemStorage();
