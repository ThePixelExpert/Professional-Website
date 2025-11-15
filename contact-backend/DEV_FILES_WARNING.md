# Development Files - DO NOT DEPLOY TO PRODUCTION

## Files in this directory are for development only:

- `server-dev.js` - Development server with hardcoded test data
- `.env.local` - Local development environment variables  
- Any `*.dev.js` files
- Test configuration files

## Production Deployment:

Use only:
- `server.js` - Production server
- `.env.production` - Production environment variables (never commit!)
- Kubernetes YAML files for configuration

## Security Note:

Development files may contain:
- Test data with fake information
- Debug logging that exposes sensitive information
- Hardcoded values for local testing
- Insecure configurations

**NEVER** include development files in production deployments!