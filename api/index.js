// Vercel serverless function entry point
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { registerRoutes } from '../server/routes';
import { storage } from '../server/storage';

// Create Express app
const app = express();
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Initialize data at startup
let dataInitialized = false;
const initializeData = async () => {
  if (!dataInitialized) {
    console.log('Initializing data for serverless function...');
    try {
      await storage.loadPropertyDataFromCSV();
      dataInitialized = true;
      console.log('Data initialization complete');
    } catch (err) {
      console.error('Error initializing data:', err);
    }
  }
};

// Initialize routes
registerRoutes(app);

// Create HTTP server
const server = createServer(app);

// Serverless function handler
export default async (req, res) => {
  // Initialize data if needed
  await initializeData();
  
  // Handle the request with Express
  return app(req, res);
};