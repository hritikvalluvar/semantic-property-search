// Vercel serverless function entry point
import express from 'express';
import cors from 'cors';
import { registerRoutes } from '../server/routes';
import { storage } from '../server/storage';

// Initialize Express
const app = express();
app.use(cors());
app.use(express.json());

// Initialize data
storage.loadPropertyDataFromCSV().catch(err => console.error('Error loading data:', err));

// Register API routes
registerRoutes(app);

// Export the Express app as a serverless function handler
export default app;