const rateLimit = require("express-rate-limit");
const helmet = require("helmet");

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: "Too many requests from this IP, please try again later",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter rate limiter for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: {
    success: false,
    error: "Too many authentication attempts, please try again later",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for sensitive operations
const sensitiveLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // limit each IP to 10 requests per hour
  message: {
    success: false,
    error: "Too many sensitive operations, please try again later",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    // Normalize incoming origin and configured origins (strip trailing slash, lowercase)
    const normalize = (url) => url.replace(/\/$/, '').toLowerCase();
    const incoming = normalize(origin);
    
    // Debug logging for CORS issues
    console.log(`🔍 CORS check - Incoming origin: ${origin} (normalized: ${incoming})`);

    // Allow localhost for local development
    if (incoming.includes('localhost') || incoming.includes('127.0.0.1')) {
      return callback(null, true);
    }

    // Allow GitHub Codespaces domains
    if (incoming.includes('githubpreview.dev') || incoming.includes('preview.app.github.dev')) {
      return callback(null, true);
    }

    // Allow custom frontend URLs from environment variables
    const allowedOriginsRaw = [
      process.env.FRONTEND_URL,
      ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',').map(url => url.trim()) : []),
      'https://zeituna.co',
      'https://www.zeituna.co',
      'http://zeituna.co',
      'http://www.zeituna.co',
      'http://localhost:5173',
      'https://localhost:5173'
    ].filter(Boolean);

    const allowedOrigins = allowedOriginsRaw.map(normalize);
    
    console.log(`🔍 CORS check - Allowed origins: ${JSON.stringify(allowedOrigins)}`);

    if (allowedOrigins.includes(incoming)) {
      console.log(`✅ CORS check - Origin ${incoming} is allowed`);
      return callback(null, true);
    }

    // Also allow if a configured origin is a registrable domain suffix of the incoming origin
    // e.g., configured "https://zeituna.co" should allow "https://www.zeituna.co"
    const allowedBySuffix = allowedOrigins.some(cfg => {
      try {
        const cfgHost = new URL(cfg).host;
        const inHost = new URL(incoming).host;
        return inHost === cfgHost || inHost.endsWith('.' + cfgHost);
      } catch {
        return false;
      }
    });

    if (allowedBySuffix) {
      console.log(`✅ CORS check - Origin ${incoming} allowed by suffix match`);
      return callback(null, true);
    }

    console.log(`❌ CORS check - Origin ${incoming} is NOT allowed`);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

// Security headers middleware
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  noSniff: true,
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
});

module.exports = {
  apiLimiter,
  authLimiter,
  sensitiveLimiter,
  corsOptions,
  securityHeaders,
}; 