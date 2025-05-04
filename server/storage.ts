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
  
  /**
   * Pre-generate property images for all properties
   */
  private async preGeneratePropertyImages(): Promise<void> {
    try {
      // Import image generation service
      const { createPropertyPrompt } = await import('./services/image-generation');
      const fs = await import('fs');
      const path = await import('path');
      
      // Create images directory
      const imagesDir = path.default.join(process.cwd(), "client", "public", "generated-images");
      if (!fs.default.existsSync(imagesDir)) {
        fs.default.mkdirSync(imagesDir, { recursive: true });
      }
      
      // For each property, generate or copy a preset image
      const properties = Array.from(this.properties.values());
      console.log(`Pre-generating images for ${properties.length} properties`);
      
      // We'll create a fixed set of pre-generated images that we'll assign to properties
      // This is to work within OpenAI API rate limits
      const propertyTypeImages: Record<string, string> = {
        'House': '/preset-house.jpg',
        'Flat': '/preset-flat.jpg',
        'Bungalow': '/preset-bungalow.jpg',
        'Penthouse': '/preset-penthouse.jpg',
        'Townhouse': '/preset-townhouse.jpg',
        'Studio': '/preset-studio.jpg',
        'Cottage': '/preset-cottage.jpg',
        'Duplex': '/preset-duplex.jpg',
        'Mansion': '/preset-mansion.jpg'
      };
      
      // Copy preset images to generated-images directory
      for (const [type, imagePath] of Object.entries(propertyTypeImages)) {
        const sourceImagePath = path.default.join(process.cwd(), "client", "public", "preset-images", imagePath);
        // If source exists, make sure we copy it (but in real use, we'd pre-create these images)
        try {
          if (!fs.default.existsSync(sourceImagePath)) {
            continue;
          }
          const destImagePath = path.default.join(imagesDir, `preset-${type.toLowerCase()}.jpg`);
          fs.default.copyFileSync(sourceImagePath, destImagePath);
        } catch (error) {
          console.error(`Error copying preset image for ${type}: ${error}`);
        }
      }
      
      // Assign images to properties based on type
      for (const property of properties) {
        const propertyType = property.type;
        const filename = `property-${property.id}-${Date.now()}.jpg`;
        const filepath = path.default.join(imagesDir, filename);
        
        // Use a preset image based on property type
        const presetImagePath = path.default.join(imagesDir, `preset-${propertyType.toLowerCase()}.jpg`);
        
        try {
          // If the preset image exists, copy it as this property's image
          if (fs.default.existsSync(presetImagePath)) {
            fs.default.copyFileSync(presetImagePath, filepath);
            console.log(`Created image for property ${property.id} using preset for ${propertyType}`);
          } else {
            // Create a placeholder file
            fs.default.writeFileSync(filepath, 'Property Image Placeholder');
            console.log(`Created placeholder image for property ${property.id}`);
          }
        } catch (error) {
          console.error(`Error creating image for property ${property.id}: ${error}`);
        }
      }
      
      console.log('Completed pre-generating property images');
    } catch (error) {
      console.error('Error pre-generating property images:', error);
    }
  }
}

export const storage = new MemStorage();
