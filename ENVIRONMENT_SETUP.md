# 🔧 Environment Variables Setup Guide

## Overview

Environment variables are used to configure your application without hardcoding sensitive information in the source code. Here's how to set them up for different scenarios:

## 🏠 **Local Development Setup**

### Step 1: Create your local environment file

1. Copy the template:
   ```bash
   cp contact-backend\.env.local contact-backend\.env.local.backup
   ```

2. Edit `contact-backend\.env.local` with your actual values:

### Step 2: Get Required Credentials

#### Stripe Test Keys (Required for payments)
1. Go to [Stripe Dashboard](https://dashboard.stripe.com/test/apikeys)
2. Get your **Test** keys:
   - `STRIPE_PUBLISHABLE_KEY=pk_test_...`
   - `STRIPE_SECRET_KEY=sk_test_...`

#### Email App Password (Required for notifications)
1. Enable 2-Factor Authentication on your Gmail account
2. Go to Google Account Settings > Security > App passwords
3. Generate an app password for "Mail"
4. Use this password (not your regular Gmail password)

#### Generate JWT Secret
```bash
# PowerShell - Generate secure JWT secret
[System.Web.Security.Membership]::GeneratePassword(64, 10)

# Or use online generator for 256-bit key
# https://www.allkeysgenerator.com/Random/Security-Encryption-Key-Generator.aspx
```

### Step 3: Set Environment Variables

#### Method 1: Using .env.local file (Recommended)
Edit `contact-backend\.env.local`:
```bash
# Replace these with your actual values:
EMAIL_USER=your-actual-email@gmail.com
EMAIL_APP_PASSWORD=your-16-char-app-password
STRIPE_PUBLISHABLE_KEY=pk_test_your_actual_key_here
STRIPE_SECRET_KEY=sk_test_your_actual_secret_key_here
JWT_SECRET=your-64-character-random-jwt-secret-here
ADMIN_PASS=your-secure-admin-password
```

#### Method 2: PowerShell Session (Temporary)
```powershell
# Set for current PowerShell session
$env:EMAIL_USER = "your-email@gmail.com"
$env:EMAIL_APP_PASSWORD = "your-app-password"
$env:STRIPE_PUBLISHABLE_KEY = "pk_test_your_key"
$env:STRIPE_SECRET_KEY = "sk_test_your_secret"
$env:JWT_SECRET = "your-jwt-secret"
$env:ADMIN_PASS = "your-admin-password"
```

#### Method 3: System Environment Variables (Persistent)
```powershell
# Set system-wide (requires admin privileges)
[Environment]::SetEnvironmentVariable("STRIPE_SECRET_KEY", "sk_test_your_key", "User")
[Environment]::SetEnvironmentVariable("JWT_SECRET", "your-jwt-secret", "User")
```

## 🚀 **Production Setup**

### For Kubernetes Deployment

#### Step 1: Generate Production Values
```bash
# Generate secure passwords
openssl rand -base64 32  # Database password
openssl rand -base64 64  # JWT secret
openssl rand -base64 16  # Admin password
```

#### Step 2: Encode for Kubernetes
```bash
# Base64 encode your secrets
echo -n "your-secret-value" | base64
```

#### Step 3: Update Kubernetes Secret
Edit `k8s/backend/secret.yaml` and replace placeholders:
```yaml
data:
  jwt-secret: <base64-encoded-jwt-secret>
  admin-password: <base64-encoded-admin-password>
  stripe-secret-key: <base64-encoded-stripe-live-key>
  email-password: <base64-encoded-email-app-password>
```

#### Step 4: Apply to Cluster
```bash
kubectl apply -f k8s/backend/secret.yaml
```

### For Docker Production

#### Step 1: Create production .env file
```bash
cp contact-backend\.env.production contact-backend\.env.production.local
# Edit with your production values
```

#### Step 2: Run with environment file
```bash
docker run --env-file contact-backend\.env.production.local your-image
```

## 🔍 **Verification**

### Test Your Configuration

#### Check if variables are loaded:
```bash
# In your backend, add temporary logging:
console.log('Environment check:', {
  nodeEnv: process.env.NODE_ENV,
  hasStripeKey: !!process.env.STRIPE_SECRET_KEY,
  hasEmailConfig: !!process.env.EMAIL_USER,
  hasJwtSecret: !!process.env.JWT_SECRET
});
```

#### Test each service:
1. **Database**: Health check endpoint `/api/health`
2. **Email**: Try sending a test email
3. **Stripe**: Create a test payment intent
4. **Auth**: Try admin login

## 🚨 **Security Best Practices**

### DO:
- ✅ Use different values for dev/staging/production
- ✅ Use app passwords for email (not regular passwords)
- ✅ Generate long, random JWT secrets (64+ characters)
- ✅ Use Stripe test keys in development
- ✅ Keep .env files in .gitignore

### DON'T:
- ❌ Commit .env files to git
- ❌ Use production keys in development
- ❌ Share environment files via email/chat
- ❌ Use weak or simple passwords
- ❌ Log sensitive environment variables

## 🔧 **Common Issues & Solutions**

### Issue: "Stripe key not found"
**Solution**: Check that `STRIPE_SECRET_KEY` is set and starts with `sk_test_` or `sk_live_`

### Issue: "Email authentication failed"  
**Solution**: 
1. Verify 2FA is enabled on Gmail
2. Use app password, not regular password
3. Check EMAIL_USER format (full email address)

### Issue: "JWT secret missing"
**Solution**: Ensure JWT_SECRET is set and at least 32 characters long

### Issue: "Admin login failed"
**Solution**: Check ADMIN_USER and ADMIN_PASS are set correctly

## 🎯 **Quick Start Commands**

```powershell
# Navigate to your project
cd "G:\Home Lab\Professional-Website"

# Edit environment file with your values
notepad contact-backend\.env.local

# Test the configuration
cd contact-backend
node server-dev.js

# Check if all services work
# Visit: http://localhost:3001/api/health
```

Remember: **Never commit real credentials to git!** Always use placeholder values in committed files.