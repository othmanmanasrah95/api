require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { isDbConnected, getDbStatus } = require('./config/db');
const User = require('./models/user');
const { corsOptions, securityHeaders, apiLimiter } = require('./middleware/security');
const { errorHandler, notFound } = require('./middleware/errorHandler');

// Route files
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
// const vendorRoutes = require('./routes/vendorRoutes');
const productRoutes = require('./routes/productRoutes');
const treeRoutes = require('./routes/treeRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const orderRoutes = require('./routes/orderRoutes');
const adminRoutes = require('./routes/adminRoutes');
const discountRoutes = require('./routes/discountRoutes');
const emailRoutes = require('./routes/emailRoutes');
const stripeRoutes = require('./routes/stripeRoutes');

// Initialize express app
const app = express();

// Trust proxy for rate limiting (required for cPanel/Passenger)
app.set('trust proxy', 1);

// DB connection is initiated in server.js before the server starts listening

// Global Middleware
app.use(securityHeaders);
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Error handling for JSON parsing
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    console.error('JSON parsing error:', err.message);
    return res.status(400).json({
      success: false,
      error: 'Invalid JSON format'
    });
  }
  next();
});
app.use(morgan('dev'));

// Debug middleware to log request bodies
app.use((req, res, next) => {
  if (req.method === 'POST' && req.path.includes('/auth')) {
    console.log('Request body:', req.body);
    console.log('Content-Type:', req.get('Content-Type'));
  }
  next();
});

// Apply rate limiting to all routes
app.use(apiLimiter);

// Root route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Zeituna API Server',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString()
  });
});

// Simple diagnostic route (no database required)
app.get('/api/simple-health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    nodeVersion: process.version,
    uptime: process.uptime()
  });
});

// Favicon handler
app.get('/favicon.ico', (req, res) => {
  res.status(204).end();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  const healthy = true;
  const dbInfo = typeof getDbStatus === 'function' ? getDbStatus() : { connected: false, stateName: 'unknown' };
  res.status(200).json({
    success: healthy,
    status: 'ok',
    db: dbInfo.connected ? 'connected' : dbInfo.stateName || 'disconnected',
    dbState: dbInfo.state,
    dbStateName: dbInfo.stateName,
    dbError: dbInfo.error,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Database diagnostic endpoint
app.get('/api/db-diagnostic', (req, res) => {
  const dbInfo = typeof getDbStatus === 'function' ? getDbStatus() : { connected: false, stateName: 'unknown' };
  
  res.status(dbInfo.connected ? 200 : 503).json({
    success: dbInfo.connected,
    database: {
      connected: dbInfo.connected,
      state: dbInfo.state,
      stateName: dbInfo.stateName,
      connectionInfo: dbInfo.connectionInfo,
      lastError: dbInfo.lastError,
      troubleshooting: dbInfo.troubleshooting
    },
    environment: {
      nodeEnv: process.env.NODE_ENV || 'development',
      mongoUriSet: !!process.env.MONGO_URI,
      mongoUriPreview: process.env.MONGO_URI ? 
        process.env.MONGO_URI.replace(/\/\/.*@/, '//***:***@') : 'Not set'
    },
    timestamp: new Date().toISOString()
  });
});

// Server IP endpoint for MongoDB Atlas whitelisting
app.get('/api/server-ip', async (req, res) => {
  try {
    const https = require('https');
    
    const getPublicIP = () => {
      return new Promise((resolve, reject) => {
        https.get('https://api.ipify.org', (res) => {
          let data = '';
          res.on('data', (chunk) => data += chunk);
          res.on('end', () => resolve(data.trim()));
        }).on('error', (err) => {
          reject(err);
        });
      });
    };
    
    const publicIP = await getPublicIP();
    
    res.json({
      success: true,
      serverIP: publicIP,
      message: 'Add this IP to your MongoDB Atlas Network Access whitelist',
      instructions: [
        '1. Go to MongoDB Atlas → Network Access',
        '2. Click "Add IP Address"',
        `3. Add this IP: ${publicIP}`,
        '4. Or use 0.0.0.0/0 for all IPs (less secure)',
        '5. Wait 2-3 minutes for propagation'
      ],
      directLink: 'https://cloud.mongodb.com/v2/[your-project-id]#/security/network/whitelist',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Could not determine server IP',
      message: error.message
    });
  }
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
// app.use('/api/vendors', vendorRoutes);
app.use('/api/products', productRoutes);
app.use('/api/trees', treeRoutes);
app.use('/api/land-plots', require('./routes/landPlotRoutes'));
app.use('/api/transactions', transactionRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/discounts', discountRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/stripe', stripeRoutes);
app.use('/api/contact', require('./routes/contactRoutes'));

// 404 handler
app.use(notFound);

// Error Handler Middleware
app.use(errorHandler);

// TEMP: Route to check if users exist
app.get('/check-users', async (req, res) => {
  try {
    const users = await User.find();
    res.status(200).json({ count: users.length, users });
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch users' });
  }
});

// Health check endpoint for uptime monitoring and frontend checks
// (duplicate removed)


module.exports = app;
