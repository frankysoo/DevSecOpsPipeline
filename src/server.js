require('dotenv').config(); // Load environment variables from .env file
const express = require('express');
const { engine } = require('express-handlebars');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet'); // Add security headers
const compression = require('compression'); // Compress responses
const rateLimit = require('express-rate-limit'); // Rate limiting for APIs
const app = express();
const PORT = process.env.PORT || 5001; // Changed default port
const db = require('./db');
const onboardingController = require('./controllers/onboarding');
// Security middleware setup
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "cdnjs.cloudflare.com", "use.fontawesome.com"], // Added fontawesome
      scriptSrc: ["'self'", "'unsafe-inline'"], // Consider more specific CSP for scripts if possible
      fontSrc: ["'self'", "cdnjs.cloudflare.com", "use.fontawesome.com"], // Added fontawesome
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"], // Allow connections to self (e.g. for API calls from JS)
      frameAncestors: ["'self'"], // Added frame-ancestors
    }
  },
  // Further helmet configurations for best practices
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true }, // Strict-Transport-Security
  frameguard: { action: 'deny' }, // X-Frame-Options
  noSniff: true, // X-Content-Type-Options
  referrerPolicy: { policy: 'same-origin' },
}));
// Compress all responses
app.use(compression());
// Rate limiting for API endpoints
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP, please try again after 15 minutes'
});
app.use('/api/', apiLimiter); // Apply to all /api/ routes
// Handlebars setup
app.engine('handlebars', engine({
  defaultLayout: 'main',
  helpers: {
    currentYear: () => new Date().getFullYear(),
    json: (context) => JSON.stringify(context), // Helper for debugging
    eq: (v1, v2) => v1 === v2,
    neq: (v1, v2) => v1 !== v2,
  }
}));
app.set('view engine', 'handlebars');
app.set('views', path.join(__dirname, '../views'));
// Basic Express configuration
app.use(express.json({ limit: '1mb' })); // Limit JSON body size
app.use(express.urlencoded({ extended: true, limit: '1mb' })); // Limit form data size
app.use(express.static(path.join(__dirname, '../public'), {
  maxAge: '1d' // Cache static assets for 1 day in production
}));
// Read artifact info if available
let artifactInfo = {
  name: 'devsecops-demo-app',
  version: 'local-dev', // Default for local development
  environment: process.env.NODE_ENV || 'development',
  timestamp: new Date().toLocaleString()
};
try {
  const artifactPath = path.join(__dirname, '../artifact_info.txt');
  if (fs.existsSync(artifactPath)) {
    const artifactFullName = fs.readFileSync(artifactPath, 'utf8').trim();
    if (artifactFullName) {
      const parts = artifactFullName.split(':');
      if (parts.length > 1) {
        const nameWithRegistry = parts[0];
        const nameParts = nameWithRegistry.split('/');
        artifactInfo.name = nameParts[nameParts.length - 1];
        artifactInfo.version = parts[1];
      } else {
         artifactInfo.name = artifactFullName; // Handle case where version might not be present
      }
    }
  }
} catch (error) {
  console.error('Error reading artifact info:', error.message);
}
// Health endpoint for monitoring and container health checks
app.get('/health', async (req, res) => { // Changed to async
  try {
    // For SQLite, a simple query to check if the DB is responsive
    await db.get('SELECT 1 AS db_status');
    res.status(200).json({
      status: 'healthy',
        version: artifactInfo.version,
        environment: artifactInfo.environment,
        timestamp: new Date().toISOString(),
      database: 'connected'
    });
  } catch (err) {
    console.error('Database health check failed:', err.message);
    res.status(503).json({ // 503 Service Unavailable is more appropriate
      status: 'unhealthy',
      version: artifactInfo.version,
      environment: artifactInfo.environment,
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: 'Database connection failed'
    });
  }
});
// Routes
app.get('/', (req, res) => {
  res.render('home', { 
    title: 'Home',
    artifact: artifactInfo
  });
});
app.get('/dashboard', (req, res) => {
  res.render('dashboard', { 
    title: 'Dashboard',
    artifact: artifactInfo
  });
});
app.get('/pipeline', (req, res) => {
  res.render('pipeline', { 
    title: 'Pipeline',
    artifact: artifactInfo
  });
});
app.get('/docs', (req, res) => {
  res.render('docs', { 
    title: 'Documentation',
    artifact: artifactInfo
  });
});
// Onboarding Routes
app.get('/onboarding', onboardingController.getOnboardingForm);
app.post('/onboarding', onboardingController.processOnboardingForm);
app.get('/api/projects', onboardingController.getAllProjects);
app.get('/api/projects/:id', onboardingController.getProjectById);
// Error handling middleware - 404
app.use((req, res, next) => {
  res.status(404).render('error', {
    title: '404 - Not Found',
    message: 'The page you are looking for does not exist.',
    statusCode: 404,
    layout: 'main' // Ensure layout is applied
  });
});
// Centralized error handler - 500
app.use((err, req, res, next) => {
  console.error('Unhandled application error:', err.stack || err.message || err);
  // Avoid sending detailed error messages to client in production
  const statusCode = err.status || 500;
  const errorMessage = process.env.NODE_ENV === 'production' && statusCode === 500 ?
    'An unexpected error occurred on the server.' :
    err.message;
  const errorDetails = process.env.NODE_ENV !== 'production' ? err.stack : undefined;

  res.status(statusCode).render('error', {
    title: statusCode === 404 ? '404 - Not Found' : 'Server Error',
    message: errorMessage,
    statusCode: statusCode,
    errorDetails: errorDetails, // Pass stack trace in dev
    layout: 'main' // Ensure layout is applied
  });
});
// Initialize database and start server
const startServer = async () => {
  try {
    // Initialize database
    await db.initializeDb();
    console.log('Database initialized successfully.');
    // Start server
    const server = app.listen(PORT, '0.0.0.0', () => { // Listen on all available interfaces
      console.log(`Server running on port ${PORT} in ${artifactInfo.environment} mode.`);
      console.log(`DevSecOps Demo App available at http://localhost:${PORT}`);
    });
    // Graceful shutdown
    const gracefulShutdown = (signal) => {
      console.log(`${signal} received, shutting down gracefully...`);
      server.close(() => {
        console.log('HTTP server closed.');
        db.db.close((err) => { // Use db.db.close() for sqlite3
          if (err) {
            console.error('Error closing SQLite database:', err.message);
            process.exit(1);
          } else {
            console.log('SQLite database connection closed.');
            process.exit(0);
          }
        });
      });
    };
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT')); // Handle Ctrl+C
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};
startServer();
module.exports = app; // Export for testing
