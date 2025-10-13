# Configuration Guide

This document outlines the environment variables and configuration options for the Zeituna platform.

## Required Environment Variables

### Database Configuration
```bash
MONGO_URI=mongodb://localhost:27017/zeituna
```

### JWT Configuration
```bash
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=7d
```

### Server Configuration
```bash
PORT=7000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

## Optional Environment Variables

### Business Logic Configuration
```bash
TAX_RATE=0.08                    # Tax rate (8%)
FREE_SHIPPING_THRESHOLD=25.00    # Free shipping threshold
SHIPPING_COST=5.00               # Standard shipping cost
```

### Security Configuration
```bash
PASSWORD_MIN_LENGTH=8            # Minimum password length
PASSWORD_SALT_ROUNDS=12          # Bcrypt salt rounds
```

### Rate Limiting Configuration
```bash
RATE_LIMIT_WINDOW_MS=900000      # 15 minutes in milliseconds
RATE_LIMIT_MAX_REQUESTS=100      # Max requests per window
AUTH_RATE_LIMIT_MAX=5            # Max auth requests per window
SENSITIVE_RATE_LIMIT_MAX=10      # Max sensitive operations per hour
```

### Pagination Configuration
```bash
PAGINATION_DEFAULT_LIMIT=10      # Default items per page
PAGINATION_MAX_LIMIT=100         # Maximum items per page
```

### File Upload Configuration
```bash
MAX_FILE_SIZE=10485760           # 10MB in bytes
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif,image/webp
```

### Blockchain Configuration
```bash
ETHEREUM_RPC_URL=https://sepolia.infura.io/v3/your-project-id
TUT_TOKEN_CONTRACT_ADDRESS=0x...
ZYT_TREE_NFT_CONTRACT_ADDRESS=0x...
```

## Environment File Setup

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Update the values in `.env` with your actual configuration

3. Never commit the `.env` file to version control

## Production Considerations

### Security
- Use strong, unique JWT secrets
- Set NODE_ENV=production
- Use HTTPS in production
- Configure proper CORS origins
- Set up proper rate limiting

### Performance
- Use connection pooling for MongoDB
- Configure Redis for caching (if applicable)
- Set up proper logging
- Monitor database performance

### Monitoring
- Set up application monitoring
- Configure error tracking
- Set up performance monitoring
- Monitor database queries

## Configuration Validation

The application will validate required environment variables on startup and exit if any are missing. This helps catch configuration issues early.

## Constants File

Most configuration values are centralized in `config/constants.js` and can be overridden by environment variables. This provides a good balance between flexibility and maintainability.
