# 🚀 Edwards Engineering - Production Deployment Guide

## 🔒 SECURITY FIRST - MANDATORY CHECKLIST

**⚠️ WARNING: DO NOT DEPLOY WITHOUT COMPLETING THESE STEPS!**

### Before Any Deployment:

1. **Complete Security Audit**
   ```bash
   # Run security check
   .\deploy-production.ps1 -SecurityCheck
   ```

2. **Review Security Checklist**
   - Read `SECURITY_CHECKLIST.md` completely
   - Verify all items are completed
   - No hardcoded secrets remain in code

3. **Environment Variables Setup**
   
   #### Generate Production Values
   ```bash
   # Generate secure passwords
   openssl rand -base64 32  # Database password
   openssl rand -base64 64  # JWT secret
   openssl rand -base64 16  # Admin password
   ```

   #### Get Required Credentials
   
   **Stripe Live Keys:**
   - Go to [Stripe Dashboard](https://dashboard.stripe.com/apikeys)
   - Get your **Live** keys (ensure you're not using test keys!)
   - `STRIPE_PUBLISHABLE_KEY=pk_live_...`
   - `STRIPE_SECRET_KEY=sk_live_...`
   
   **Email App Password:**
   - Enable 2-Factor Authentication on your Gmail account
   - Go to Google Account Settings > Security > App passwords
   - Generate an app password for "Mail"
   - Use this app password (not your regular Gmail password)
   
   #### For Kubernetes Deployment
   
   **Step 1: Encode for Kubernetes**
   ```bash
   # Base64 encode your secrets
   echo -n "your-secret-value" | base64
   ```
   
   **Step 2: Update Kubernetes Secret**
   Edit `k8s/backend/secret.yaml` and replace placeholders:
   ```yaml
   data:
     jwt-secret: <base64-encoded-jwt-secret>
     admin-password: <base64-encoded-admin-password>
     stripe-secret-key: <base64-encoded-stripe-live-key>
     email-password: <base64-encoded-email-app-password>
   ```
   
   **Step 3: Apply to Cluster**
   ```bash
   kubectl apply -f k8s/backend/secret.yaml
   ```
   
   #### For Docker Production
   
   **Step 1: Create production .env file**
   ```bash
   cp contact-backend/.env.template contact-backend/.env.production
   # Edit with your production values
   ```
   
   **Step 2: Set environment variables**
   ```bash
   # Set all required environment variables
   $env:STRIPE_SECRET_KEY="sk_live_your_live_key"
   $env:STRIPE_PUBLISHABLE_KEY="pk_live_your_live_key"
   $env:JWT_SECRET="your-256-bit-jwt-secret"
   $env:ADMIN_USER="your-admin-username"
   $env:ADMIN_PASS="your-secure-admin-password"
   $env:DB_PASSWORD="your-secure-database-password"
   $env:EMAIL_USER="your-business-email@domain.com"
   $env:EMAIL_APP_PASSWORD="your-email-app-password"
   ```

## 🏗️ Production Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Load Balancer │────│   Kubernetes    │────│   PostgreSQL    │
│   (Traefik)     │    │   Cluster       │    │   Database      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
    HTTPS/TLS             Container Security      Encrypted Data
    Termination           + Resource Limits       + Backup Strategy
```

## 🔧 Deployment Process

### 1. Pre-Deployment Security Check
```bash
# Check for security issues
.\deploy-production.ps1 -SecurityCheck -DryRun

# If security check passes, proceed
```

### 2. Production Deployment
```bash
# Deploy to production (after security check passes)
.\deploy-production.ps1 -Environment production

# Monitor deployment
kubectl get pods -n website -w
```

### 3. Post-Deployment Verification
```bash
# Check all pods are running
kubectl get pods -n website

# Verify health endpoints
curl https://edwards-engineering.dev/api/health

# Check logs for errors
kubectl logs -l app=edwards-backend -n website
```

## 🛡️ Security Features Implemented

### Application Security
- ✅ JWT token-based authentication
- ✅ Password hashing with bcrypt
- ✅ Rate limiting on API endpoints
- ✅ CORS configuration
- ✅ Input validation and sanitization
- ✅ Secure session management

### Infrastructure Security
- ✅ Non-root container user
- ✅ Read-only root filesystem
- ✅ Resource limits and requests
- ✅ Security contexts configured
- ✅ Kubernetes secrets for sensitive data
- ✅ Network policies (recommended to add)

### Data Security
- ✅ Encrypted database connections
- ✅ Secure environment variable handling
- ✅ No hardcoded secrets in code
- ✅ Proper backup strategies
- ✅ Audit logging capabilities

## 🔍 Monitoring & Maintenance

### Health Monitoring
```bash
# Check application health
curl https://edwards-engineering.dev/api/health

# Monitor resource usage
kubectl top pods -n website

# Check certificate status
kubectl get certificates -n website
```

### Log Monitoring
```bash
# Backend application logs
kubectl logs -l app=edwards-backend -n website -f

# Frontend logs
kubectl logs -l app=edwards-frontend -n website -f

# Database logs
kubectl logs -l app=postgres -n website -f
```

### Security Monitoring
- Monitor failed authentication attempts
- Track unusual API usage patterns
- Alert on certificate expiration
- Regular security updates

## 🔄 Updates & Maintenance

### Regular Updates
1. **Security patches** - Apply immediately
2. **Dependency updates** - Review and test
3. **Certificate renewal** - Monitor expiration
4. **Database maintenance** - Regular backups

### Rollback Procedure
```bash
# Rollback to previous version
kubectl rollout undo deployment/edwards-backend-deployment -n website
kubectl rollout undo deployment/edwards-frontend-deployment -n website

# Check rollback status
kubectl rollout status deployment/edwards-backend-deployment -n website
```

## 🔧 Troubleshooting

### Common Issues & Solutions

#### Issue: "Stripe key not found"
**Solution**: 
- Verify that `STRIPE_SECRET_KEY` is set and starts with `sk_live_` (not `sk_test_`)
- Check Kubernetes secret is properly applied: `kubectl get secret edwards-backend-secret -n website -o yaml`

#### Issue: "Email authentication failed"
**Solution**: 
1. Verify 2FA is enabled on Gmail
2. Use app password, not regular password
3. Check EMAIL_USER format (full email address)
4. Verify email credentials in Kubernetes secret

#### Issue: "JWT secret missing"
**Solution**: 
- Ensure JWT_SECRET is set and at least 64 characters long
- Check Kubernetes secret contains jwt-secret key
- Verify base64 encoding is correct

#### Issue: "Admin login failed"
**Solution**: 
- Check ADMIN_USER and ADMIN_PASS are set correctly
- Verify admin credentials in Kubernetes secret
- Check backend logs for authentication errors

#### Issue: "Database connection failed"
**Solution**:
- Verify PostgreSQL pod is running: `kubectl get pods -l app=postgres -n website`
- Check database credentials are correct
- Verify network connectivity between backend and database pods
- Review database logs for connection errors

## 🚨 Emergency Procedures

### Security Incident Response
1. **Immediate Actions**
   - Scale down affected services
   - Rotate all secrets and tokens
   - Review access logs
   - Document incident

2. **Investigation**
   - Analyze logs for breach indicators
   - Check database for unauthorized access
   - Review recent deployments
   - Assess data exposure

3. **Recovery**
   - Apply security patches
   - Update all credentials
   - Implement additional monitoring
   - Test all systems

### Contact Information
- **Technical Lead**: [Your Contact Info]
- **Security Team**: [Security Contact]
- **Infrastructure**: [Infra Contact]

## 📋 Compliance & Documentation

### Required Documentation
- [ ] Security assessment report
- [ ] Penetration testing results
- [ ] Compliance verification (if applicable)
- [ ] Disaster recovery plan
- [ ] Incident response procedures

### Regular Audits
- Monthly security review
- Quarterly penetration testing
- Annual compliance assessment
- Continuous monitoring setup

---

**Remember**: Security is not a one-time setup but an ongoing process. Regular reviews, updates, and monitoring are essential for maintaining a secure production environment.