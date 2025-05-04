// Vercel serverless function handler (CommonJS syntax)
const express = require('express');
const cors = require('cors');
const { registerRoutes } = require('../server/routes');
const { storage } = require('../server/storage');

// Create Express app
const app = express();
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Setup for serverless function
let isDataInitialized = false;

// Initialize data on cold start
const initializeData = async () => {
  console.log("Initializing data in serverless function");
  if (!isDataInitialized) {
    try {
      await storage.loadPropertyDataFromCSV();
      isDataInitialized = true;
      console.log("Data successfully initialized");
    } catch (error) {
      console.error("Error initializing data:", error);
      // Still mark as initialized to prevent infinite retries
      isDataInitialized = true;
    }
  }
};

// Register API routes
registerRoutes(app);

// Serverless function handler
module.exports = async function handler(req, res) {
  console.log(`API request received: ${req.method} ${req.url}`);
  
  // Initialize data on first request (cold start)
  try {
    await initializeData();
  } catch (error) {
    console.error("Error during data initialization:", error);
  }
  
  // Special handling for OPTIONS requests (CORS preflight)
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  // Forward the request to Express
  return app(req, res);
}