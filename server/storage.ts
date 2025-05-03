import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse';
import { 
  Property, 
  FilterOptions, 
  PropertyEmbedding,
  User,
  InsertUser,
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
  private properties: Map<string, Property>;
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

    // Path to CSV file
    const csvFilePath = path.resolve(process.cwd(), 'semantic_property_listings.csv');

    // Check if file exists
    if (!fs.existsSync(csvFilePath)) {
      console.log(`CSV file not found at ${csvFilePath}, loading mock data`);
      // Load mock data instead
      this.loadMockPropertyData();
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
    
    // Process each row
    for await (const row of parser) {
      const property: Property = {
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
        embedding: row.embedding || null
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
  
  private loadMockPropertyData(): void {
    // Mock property data for testing when CSV is not available
    const mockProperties: Property[] = [
      {
        id: 1,
        title: "Elegant Modern House with Park View",
        description: "A stunning modern house with 4 spacious bedrooms, large open-plan living area, and beautiful views overlooking the park. Features high-end finishes, a designer kitchen, and private garden.",
        location: "Richmond",
        type: "House",
        style: "Modern",
        bedrooms: 4,
        bathrooms: 2,
        price: 1250000,
        view: "Park",
        furnishing: "Unfurnished",
        embedding: null
      },
      {
        id: 2,
        title: "Charming Victorian Flat",
        description: "Beautiful Victorian conversion flat with original features including high ceilings and ornate cornicing. Two double bedrooms, modern bathroom, and a south-facing living room overlooking communal gardens.",
        location: "Wimbledon",
        type: "Flat",
        style: "Victorian",
        bedrooms: 2,
        bathrooms: 1,
        price: 650000,
        view: "Garden",
        furnishing: "Partly Furnished",
        embedding: null
      },
      {
        id: 3,
        title: "Luxury Riverside Bungalow",
        description: "Spacious 5-bedroom contemporary bungalow with stunning views of the river. Features include floor-to-ceiling windows, private mooring, luxury kitchen, and landscaped gardens leading down to the riverbank.",
        location: "Greenwich",
        type: "Bungalow",
        style: "Contemporary",
        bedrooms: 5,
        bathrooms: 3,
        price: 1750000,
        view: "River",
        furnishing: "Unfurnished",
        embedding: null
      },
      {
        id: 4,
        title: "Stylish City Townhouse",
        description: "Modern 3-bedroom townhouse with spectacular city views. Features an integrated smart home system, private roof terrace, secure parking, and high specification throughout.",
        location: "Canary Wharf",
        type: "Townhouse",
        style: "Contemporary",
        bedrooms: 3,
        bathrooms: 2,
        price: 975000,
        view: "City",
        furnishing: "Furnished",
        embedding: null
      },
      {
        id: 5,
        title: "Cozy Garden Cottage",
        description: "Charming traditional cottage with beautiful walled garden. Featuring two bedrooms, exposed beams, inglenook fireplace, and country-style kitchen. A perfect blend of period features and modern comfort.",
        location: "Richmond",
        type: "Cottage",
        style: "Traditional",
        bedrooms: 2,
        bathrooms: 1,
        price: 850000,
        view: "Garden",
        furnishing: "Furnished",
        embedding: null
      }
    ];
    
    // Store mock properties and generate their embeddings
    mockProperties.forEach(property => {
      this.properties.set(property.id.toString(), property);
      
      const textToEmbed = `${property.title}. ${property.description}. ${property.type} in ${property.location}. ${property.style} style. ${property.bedrooms} bedrooms. ${property.bathrooms} bathrooms. ${property.view} view. ${property.furnishing}.`;
      
      getEmbedding(textToEmbed)
        .then(embedding => {
          this.propertyEmbeddings.set(property.id.toString(), embedding);
          
          // Upsert to Pinecone
          upsertVectors([{
            id: property.id.toString(),
            embedding
          }]).catch(error => {
            console.error(`Error upserting vector for property ${property.id}: ${error}`);
          });
        })
        .catch(error => {
          console.error(`Error generating embedding for property ${property.id}: ${error}`);
        });
    });
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
}

export const storage = new MemStorage();
