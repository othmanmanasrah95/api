const mongoose = require('mongoose');
const https = require('https');

// Configure mongoose globally
mongoose.set('bufferCommands', false);

let connectionAttempts = 0;
let lastConnectionError = null;

// Function to get server's public IP address
const getServerPublicIP = async () => {
  return new Promise((resolve, reject) => {
    https.get('https://api.ipify.org', (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve(data.trim()));
    }).on('error', (err) => {
      console.warn('⚠️  Could not determine server public IP:', err.message);
      resolve('Unknown');
    });
  });
};

// Function to test connection with detailed diagnostics
const testConnection = async () => {
  try {
    console.log('🔍 Testing MongoDB connection with detailed diagnostics...');
    
    // Get server's public IP for MongoDB Atlas whitelisting
    const serverIP = await getServerPublicIP();
    console.log(`   Server Public IP: ${serverIP}`);
    
    // Test basic connection
    const testConn = await mongoose.createConnection(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
      socketTimeoutMS: 5000
    });
    
    // Wait for connection to be ready
    await new Promise((resolve, reject) => {
      testConn.once('connected', resolve);
      testConn.once('error', reject);
      
      // Timeout after 10 seconds
      setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, 10000);
    });
    
    // Test if we can ping the database
    if (testConn.db && testConn.db.admin) {
      await testConn.db.admin().ping();
      console.log('✅ Connection test successful - database is reachable');
    } else {
      console.log('✅ Connection established (ping test skipped)');
    }
    
    // Close test connection
    await testConn.close();
    return true;
  } catch (error) {
    console.error('❌ Connection test failed:');
    console.error(`   Error Type: ${error.name}`);
    console.error(`   Error Message: ${error.message}`);
    console.error(`   Error Code: ${error.code || 'N/A'}`);
    
    if (error.name === 'MongooseServerSelectionError') {
      console.error('   🔍 This indicates an IP whitelisting issue with MongoDB Atlas');
      console.error('   📋 Steps to fix:');
      console.error('      1. Go to MongoDB Atlas → Network Access');
      console.error('      2. Click "Add IP Address"');
      console.error(`      3. Add this IP: ${serverIP}`);
      console.error('      4. Or use 0.0.0.0/0 for all IPs (less secure)');
      console.error('      5. Wait 2-3 minutes for propagation');
      console.error('   🔗 Direct link: https://cloud.mongodb.com/v2/[your-project-id]#/security/network/whitelist');
    } else if (error.message.includes('timeout')) {
      console.error('   🔍 Connection timeout - this usually indicates:');
      console.error('      - IP address not whitelisted in MongoDB Atlas');
      console.error('      - Network connectivity issues');
      console.error('      - MongoDB Atlas cluster is paused');
      console.error('   📋 Try adding this IP to MongoDB Atlas:');
      console.error(`      IP: ${serverIP}`);
    }
    
    return false;
  }
};

// Helpful map of mongoose ready states
const READY_STATE = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting'
};

// Attach connection event listeners once
mongoose.connection.on('connected', () => {
  lastConnectionError = null;
  console.log('🟢 MongoDB connected');
});

mongoose.connection.on('error', (err) => {
  lastConnectionError = err;
  console.error('❌ MongoDB connection error:', err.message);
});

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️  MongoDB disconnected');
});

/**
 * Establish a MongoDB connection and resolve only when connected.
 * Retries up to a limited number of attempts with incremental backoff.
 */
const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    console.log('✅ Database already connected');
    return;
  }

  // Validate MongoDB URI
  if (!process.env.MONGO_URI) {
    const error = new Error('MONGO_URI environment variable is not set');
    console.error('❌ Database Configuration Error:');
    console.error('   MONGO_URI environment variable is missing');
    console.error('   Please set MONGO_URI in your .env file or environment variables');
    console.error('   Example: MONGO_URI=mongodb://localhost:27017/zeituna');
    throw error;
  }

  console.log('🔍 Attempting to connect to MongoDB...');
  console.log(`   URI: ${process.env.MONGO_URI.replace(/\/\/.*@/, '//***:***@')}`); // Hide credentials in logs

  // First, run a diagnostic test
  const testResult = await testConnection();
  if (!testResult) {
    console.error('🛑 Pre-connection test failed. Please fix the issues above before proceeding.');
    throw new Error('Connection test failed - see diagnostics above');
  }

  const maxAttempts = 5;
  const baseDelayMs = 2000;

  while (connectionAttempts < maxAttempts) {
    try {
      connectionAttempts += 1;
      console.log(`🔄 Connection attempt ${connectionAttempts}/${maxAttempts}...`);
      
      const conn = await mongoose.connect(process.env.MONGO_URI, {
        serverSelectionTimeoutMS: 10000, // 10 seconds timeout
        connectTimeoutMS: 10000,
        socketTimeoutMS: 10000,
        maxPoolSize: 10,
        minPoolSize: 1,
        maxIdleTimeMS: 30000,
        bufferCommands: false,
        useNewUrlParser: true,
        useUnifiedTopology: true
      });
      
      console.log(`🟢 MongoDB Connected Successfully!`);
      console.log(`   Host: ${conn.connection.host}`);
      console.log(`   Port: ${conn.connection.port}`);
      console.log(`   Database: ${conn.connection.name}`);
      console.log(`   Ready State: ${conn.connection.readyState}`);
      return;
    } catch (error) {
      lastConnectionError = error;
      const backoff = baseDelayMs * connectionAttempts;
      
      console.error(`❌ MongoDB connection failed (attempt ${connectionAttempts}/${maxAttempts})`);
      console.error(`   Error: ${error.message}`);
      
      // Provide specific guidance based on error type
      if (error.name === 'MongoServerError') {
        console.error('   💡 This is a MongoDB server error. Check:');
        console.error('      - MongoDB server is running');
        console.error('      - Server is accessible from your network');
        console.error('      - Database name and credentials are correct');
        console.error('      - If using MongoDB Atlas, check IP whitelist in Network Access');
      } else if (error.name === 'MongoNetworkError') {
        console.error('   💡 This is a network connectivity error. Check:');
        console.error('      - Internet connection is working');
        console.error('      - MongoDB server is reachable');
        console.error('      - Firewall settings allow the connection');
        console.error('      - If using MongoDB Atlas, check IP whitelist');
        console.error('      - Try adding your server IP to MongoDB Atlas Network Access');
      } else if (error.name === 'MongoParseError') {
        console.error('   💡 This is a connection string parsing error. Check:');
        console.error('      - MONGO_URI format is correct');
        console.error('      - No special characters in password');
        console.error('      - Proper URL encoding for special characters');
      } else if (error.name === 'MongoTimeoutError') {
        console.error('   💡 This is a connection timeout error. Check:');
        console.error('      - MongoDB server is responding');
        console.error('      - Network latency is acceptable');
        console.error('      - Server resources are available');
      } else if (error.name === 'MongooseServerSelectionError') {
        console.error('   💡 This is a server selection error. Common causes:');
        console.error('      - IP address not whitelisted in MongoDB Atlas');
        console.error('      - Network connectivity issues');
        console.error('      - MongoDB Atlas cluster is paused or unavailable');
        console.error('      - Authentication credentials are incorrect');
        console.error('   🔧 MongoDB Atlas specific fixes:');
        console.error('      1. Go to Network Access in MongoDB Atlas');
        console.error('      2. Add your server IP address (or use 0.0.0.0/0 for all IPs)');
        console.error('      3. Wait 2-3 minutes for changes to propagate');
        console.error('      4. Check if cluster is running (not paused)');
      }
      
      if (connectionAttempts >= maxAttempts) {
        console.error('🛑 Maximum connection attempts reached');
        console.error('   Troubleshooting steps:');
        console.error('   1. Verify MongoDB is running: mongosh --eval "db.runCommand({ping: 1})"');
        console.error('   2. Check connection string format');
        console.error('   3. Verify network connectivity');
        console.error('   4. Check MongoDB logs for errors');
        console.error('   5. Ensure database user has proper permissions');
        throw error;
      }
      
      console.error(`⏳ Retrying in ${Math.round(backoff / 1000)}s...`);
      await new Promise((r) => setTimeout(r, backoff));
    }
  }
};

const isDbConnected = () => mongoose.connection.readyState === 1;

const getDbStatus = () => {
  const state = mongoose.connection.readyState;
  const connection = mongoose.connection;
  
  return {
    connected: state === 1,
    state,
    stateName: READY_STATE[state] || 'unknown',
    error: lastConnectionError ? lastConnectionError.message : null,
    connectionInfo: state === 1 ? {
      host: connection.host,
      port: connection.port,
      name: connection.name,
      readyState: connection.readyState
    } : null,
    lastError: lastConnectionError ? {
      name: lastConnectionError.name,
      message: lastConnectionError.message,
      code: lastConnectionError.code
    } : null,
    troubleshooting: state !== 1 ? {
      steps: [
        '1. Check if MONGO_URI is set correctly',
        '2. Verify MongoDB server is running',
        '3. Check network connectivity',
        '4. Verify authentication credentials',
        '5. Check firewall and security settings'
      ],
      commonIssues: [
        'MongoDB server not running',
        'Incorrect connection string format',
        'Network connectivity problems',
        'Authentication failures',
        'Firewall blocking connections'
      ]
    } : null
  };
};

module.exports = { connectDB, isDbConnected, getDbStatus };
