require('dotenv').config();

// Validate required environment variables
const requiredEnvVars = ['JWT_SECRET', 'MONGO_URI'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingEnvVars.join(', '));
  console.error('Please set these variables in your .env file or environment');
  process.exit(1);
}

// Set fallback values for development only
if (process.env.NODE_ENV !== 'production') {
  if (!process.env.MONGO_URI) {
    process.env.MONGO_URI = 'mongodb://localhost:27017/zeituna';
    console.warn('⚠️  Using default MongoDB URI for development');
  }
}

const app = require('./app');
const { connectDB } = require('./config/db');

const PORT = process.env.PORT;

// Connect to database before starting server
const startServer = async () => {
  try {
    console.log('🚀 Starting Zeituna API Server...');
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`   Port: ${PORT}`);
    
    // Try to connect to database, but don't fail if it doesn't work
    try {
      await connectDB();
      console.log('✅ Database connected successfully');
    } catch (dbError) {
      console.error('⚠️  Database connection failed, but server will start in limited mode');
      console.error(`   Database Error: ${dbError.message}`);
      console.error('   Some features may not work until database is connected');
    }
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log('🎉 Server started successfully!');
      console.log(`🚀 Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
      console.log(`🌐 Server accessible at: http://localhost:${PORT}`);
      console.log(`🔗 In Codespaces, use the forwarded port URL`);
      console.log('');
      console.log('📋 Available endpoints:');
      console.log(`   GET  /                    - API info`);
      console.log(`   GET  /api/simple-health   - Simple health check (no DB)`);
      console.log(`   GET  /api/health          - Health check`);
      console.log(`   GET  /api/db-diagnostic   - Detailed database diagnostics`);
      console.log(`   GET  /api/server-ip       - Get server IP for MongoDB Atlas`);
      console.log(`   GET  /api/products/test   - Database connection test`);
      console.log(`   GET  /api/products        - Get products`);
      console.log('');
    });
  } catch (error) {
    console.error('💥 CRITICAL ERROR: Failed to start server');
    console.error('');
    console.error('🔍 Error Details:');
    console.error(`   Type: ${error.name || 'Unknown'}`);
    console.error(`   Message: ${error.message}`);
    console.error('');
    
    if (error.message.includes('EADDRINUSE')) {
      console.error('🔧 Port Already in Use:');
      console.error('   1. Another process is using port 3000');
      console.error('   2. Check if another instance is running');
      console.error('   3. Kill the process or change the port');
    } else if (error.message.includes('EACCES')) {
      console.error('🔧 Permission Denied:');
      console.error('   1. Check if you have permission to bind to port 3000');
      console.error('   2. Try running with different permissions');
    }
    
    console.error('');
    console.error('🆘 Need Help?');
    console.error('   - Check if port 3000 is available');
    console.error('   - Verify your server configuration');
    console.error('   - Check cPanel error logs');
    console.error('');
    
    process.exit(1);
  }
};

startServer();
