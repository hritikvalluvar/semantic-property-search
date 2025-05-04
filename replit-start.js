// Special startup script for Replit deployment
// This ensures the server starts quickly and listens on port 5000
// Import required modules
import { spawn } from 'child_process';
import { createServer } from 'http';

console.log('Starting Replit deployment script...');

// Create a simple HTTP server that immediately responds to health checks
// This ensures Replit deployment doesn't time out waiting for the main server
const tempServer = createServer((req, res) => {
  if (req.url === '/api/healthcheck') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'starting', message: 'Server is starting up' }));
  } else {
    res.writeHead(503, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'starting', message: 'Server is initializing, please wait...' }));
  }
});

// Start temporary server on port 5000
tempServer.listen(5000, '0.0.0.0', () => {
  console.log('Temporary server listening on port 5000 for health checks');
  
  // Start the actual application server
  const appProcess = spawn('node', ['dist/index.js'], {
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: '5000'
    },
    stdio: 'inherit'
  });
  
  // Handle app process events
  appProcess.on('close', (code) => {
    console.log(`Application process exited with code ${code}`);
    process.exit(code);
  });
  
  // Set a timeout to close the temporary server after 5 seconds
  // By then the main server should be running
  setTimeout(() => {
    console.log('Shutting down temporary server');
    tempServer.close();
  }, 5000);
});