// build.mjs - Custom build script for Vercel deployment
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Function to execute commands and log output
function exec(command) {
  console.log(`Executing: ${command}`);
  try {
    execSync(command, { stdio: 'inherit' });
  } catch (error) {
    console.error(`Command failed: ${command}`);
    throw error;
  }
}

// Main build function
async function build() {
  console.log('Starting custom build process for Vercel deployment...');
  
  // Build the frontend with Vite
  console.log('\n1. Building frontend with Vite...');
  exec('vite build');
  
  // Ensure API directory exists in output
  console.log('\n2. Preparing API files...');
  const distApiDir = path.join('dist', 'api');
  if (!fs.existsSync(distApiDir)) {
    fs.mkdirSync(distApiDir, { recursive: true });
  }
  
  // Copy API files to output directory
  console.log('   Copying API files to dist/api...');
  const apiFiles = fs.readdirSync('api');
  apiFiles.forEach(file => {
    const src = path.join('api', file);
    const dest = path.join(distApiDir, file);
    fs.copyFileSync(src, dest);
    console.log(`   - Copied ${src} to ${dest}`);
  });
  
  // Create data directory for CSV file
  console.log('\n3. Setting up data files...');
  const dataDir = path.join(distApiDir, 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  // Copy CSV data file
  if (fs.existsSync('semantic_property_listings.csv')) {
    fs.copyFileSync(
      'semantic_property_listings.csv',
      path.join(dataDir, 'semantic_property_listings.csv')
    );
    console.log('   - Copied semantic_property_listings.csv to API data directory');
  } else {
    console.warn('   - WARNING: semantic_property_listings.csv not found, API may fall back to mock data');
  }
  
  console.log('\nCustom build completed successfully!');
}

// Run the build
build().catch(error => {
  console.error('Build failed:', error);
  process.exit(1);
});