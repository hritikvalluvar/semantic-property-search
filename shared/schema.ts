import { pgTable, text, serial, integer, boolean, varchar, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table (inherited from template)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Property listings table
export const propertyListings = pgTable("property_listings", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  location: text("location").notNull(),
  type: text("type").notNull(),
  style: text("style").notNull(),
  bedrooms: integer("bedrooms").notNull(),
  bathrooms: integer("bathrooms").notNull(),
  price: integer("price").notNull(),
  view: text("view").notNull(),
  furnishing: text("furnishing").notNull(),
  embedding: text("embedding"),  // Store as JSON string since drizzle doesn't have vector type
});

export const insertPropertySchema = createInsertSchema(propertyListings).omit({
  id: true,
  embedding: true
});

export type InsertProperty = z.infer<typeof insertPropertySchema>;
export type Property = typeof propertyListings.$inferSelect;

// Property embedding for vector search
export interface PropertyEmbedding {
  id: string;
  embedding: number[];
}

// Coordinates for location-based search
export interface Coordinates {
  lat: number;
  lng: number;
}

// Property with geo-coordinates
export interface PropertyWithCoordinates extends Property {
  coordinates?: Coordinates;
}

// Search result with score
export interface SearchResult extends PropertyWithCoordinates {
  score: number;
  distance?: number; // Distance in km from query location (if specified)
}

// Filter options
export interface FilterOptions {
  types: string[];
  styles: string[];
  locations: string[];
  bedrooms: { min: number; max: number };
  bathrooms: { min: number; max: number };
  price: { min: number; max: number };
  views: string[];
  furnishings: string[];
}
