import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000 for Replit deployment
  // this serves both the API and the client.
  // It is the only port that is not firewalled in Replit.
  const port = process.env.PORT ? parseInt(process.env.PORT) : 5000;
  
  // Create an immediate health check response for deployment
  // This helps with Replit deployment which times out if the server doesn't
  // respond quickly enough to health checks
  app.get('/api/healthcheck', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'Server is running' });
  });
  
  server.listen(port, "0.0.0.0", () => {
    log(`serving on port ${port}`);
    
    // Log that we're ready for Replit's deployment health checks
    console.log(`\n=== DEPLOYMENT READY ===`);
    console.log(`Server is listening on port ${port} and ready for health checks`);
    console.log(`Health check endpoint: http://localhost:${port}/api/healthcheck`);
    console.log(`======================================\n`);
  });
})();
