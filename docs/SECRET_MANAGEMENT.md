# 🔐 Secret Management with Bitwarden

This guide explains how to securely manage development secrets using Bitwarden CLI for the Professional Website project.

## 📋 Table of Contents

- [Overview](#overview)
- [Why Bitwarden?](#why-bitwarden)
- [Prerequisites](#prerequisites)
- [Initial Setup](#initial-setup)
- [Creating the Bitwarden Item](#creating-the-bitwarden-item)
- [Secret Naming Conventions](#secret-naming-conventions)
- [Usage Instructions](#usage-instructions)
  - [Linux/Mac Setup](#linuxmac-setup)
  - [Windows Setup](#windows-setup)
- [Validation](#validation)
- [Troubleshooting](#troubleshooting)
- [Security Best Practices](#security-best-practices)
- [FAQ](#faq)

---

## Overview

This project uses Bitwarden CLI to securely manage development secrets across multiple machines without exposing them publicly. The system automatically retrieves secrets from your Bitwarden vault and generates local `.env` files for development.

### Key Features

✅ **Secure Storage**: Secrets stored in encrypted Bitwarden vault  
✅ **Multi-Platform**: Works on Linux, macOS, and Windows  
✅ **Easy Sharing**: Share secrets across your devices via Bitwarden sync  
✅ **No Git Exposure**: Secrets never committed to version control  
✅ **Automatic Setup**: Automated scripts handle all configuration  
✅ **Validation**: Built-in validation ensures all required secrets are present

---

## Why Bitwarden?

**Benefits of using Bitwarden for secret management:**

1. **Security**: Military-grade encryption (AES-256) for all secrets
2. **Accessibility**: Access secrets from any device with Bitwarden installed
3. **Version Control Safe**: Secrets never accidentally committed to Git
4. **Team Sharing**: Easy to share secrets with team members (via Bitwarden organizations)
5. **Audit Trail**: Track when secrets are accessed or modified
6. **Free & Open Source**: No cost for personal use, open-source architecture

---

## Prerequisites

Before you begin, ensure you have:

1. **Bitwarden Account**
   - Create a free account at [https://bitwarden.com](https://bitwarden.com)
   - Remember your master password (cannot be recovered if lost!)

2. **Bitwarden CLI Installed**
   - **macOS**: `brew install bitwarden-cli`
   - **Linux**: `snap install bw` or download from [GitHub releases](https://github.com/bitwarden/clients/releases)
   - **Windows**: 
     - Chocolatey: `choco install bitwarden-cli`
     - Scoop: `scoop install bitwarden-cli`
     - Manual: Download from [GitHub releases](https://github.com/bitwarden/clients/releases)

3. **jq (JSON processor)** - Required for Linux/Mac script
   - **macOS**: `brew install jq`
   - **Linux**: `sudo apt-get install jq` or `sudo yum install jq`
   - **Windows**: Not required (PowerShell handles JSON natively)

4. **Git Repository Access**
   - Clone this repository to your local machine

---

## Initial Setup

### Step 1: Install Bitwarden CLI

Choose the installation method for your platform from the [Prerequisites](#prerequisites) section above.

### Step 2: Login to Bitwarden

Open a terminal and login to your Bitwarden account:

```bash
bw login your-email@example.com
```

You'll be prompted for your master password. After successful login, you're ready to proceed.

---

## Creating the Bitwarden Item

You need to create a secure note in Bitwarden to store all development secrets.

### Using Bitwarden Web Vault (Recommended)

1. **Login to Bitwarden Web Vault**
   - Go to [https://vault.bitwarden.com](https://vault.bitwarden.com)
   - Login with your credentials

2. **Create New Item**
   - Click the **"+"** button or **"Add Item"**
   - Select type: **"Secure Note"**

3. **Configure Item**
   - **Name**: `Professional-Website-Dev-Secrets`
   - **Notes**: (Optional) Add a description like "Development secrets for Professional Website project"

4. **Add Custom Fields**
   
   Click **"+ New Custom Field"** for each of the following (Type: **Text** for all):

   | Field Name | Description | Example Value | Required |
   |------------|-------------|---------------|----------|
   | `EMAIL_USER` | Gmail address for sending emails | your-email@gmail.com | ✅ Yes |
   | `EMAIL_APP_PASSWORD` | Gmail app password (16 chars) | abcd efgh ijkl mnop | ✅ Yes |
   | `JWT_SECRET` | Random string for JWT signing (64+ chars) | your-random-64-char-string | ✅ Yes |
   | `ADMIN_PASS` | Admin dashboard password | YourSecurePassword123! | ✅ Yes |
   | `ADMIN_USER` | Admin username | admin | ⚠️ Optional |
   | `STRIPE_PUBLISHABLE_KEY` | Stripe publishable key | pk_test_51... | ⚠️ Optional |
   | `STRIPE_SECRET_KEY` | Stripe secret key | sk_test_51... | ⚠️ Optional |
   | `STRIPE_WEBHOOK_SECRET` | Stripe webhook secret | whsec_... | ⚠️ Optional |
   | `DB_PASSWORD` | Database password | postgres123 | ⚠️ Optional |

5. **Save the Item**
   - Click **"Save"** to store the item in your vault

### Using Bitwarden CLI (Alternative)

You can also create the item using the CLI:

```bash
# Unlock your vault first
export BW_SESSION=$(bw unlock --raw)

# Create a template
cat > bitwarden-secrets.json << 'EOF'
{
  "organizationId": null,
  "folderId": null,
  "type": 2,
  "name": "Professional-Website-Dev-Secrets",
  "notes": "Development secrets for Professional Website project",
  "favorite": false,
  "secureNote": {
    "type": 0
  },
  "fields": [
    {"name": "EMAIL_USER", "value": "your-email@gmail.com", "type": 0},
    {"name": "EMAIL_APP_PASSWORD", "value": "your-app-password", "type": 0},
    {"name": "JWT_SECRET", "value": "your-jwt-secret-here", "type": 0},
    {"name": "ADMIN_PASS", "value": "your-admin-password", "type": 0},
    {"name": "ADMIN_USER", "value": "admin", "type": 0},
    {"name": "STRIPE_PUBLISHABLE_KEY", "value": "pk_test_placeholder", "type": 0},
    {"name": "STRIPE_SECRET_KEY", "value": "sk_test_placeholder", "type": 0},
    {"name": "STRIPE_WEBHOOK_SECRET", "value": "whsec_placeholder", "type": 0},
    {"name": "DB_PASSWORD", "value": "postgres123", "type": 0}
  ]
}
EOF

# Encode and create the item
bw encode < bitwarden-secrets.json | bw create item --session $BW_SESSION

# Sync to cloud
bw sync --session $BW_SESSION

# Lock vault
bw lock
```

---

## Secret Naming Conventions

All secrets follow these conventions:

### Required Secrets

These **must** be set for the application to function:

- `EMAIL_USER` - Gmail address for sending notification emails
- `EMAIL_APP_PASSWORD` - Gmail app password (not regular password)
- `JWT_SECRET` - Secret for signing JWT authentication tokens (minimum 32 characters)
- `ADMIN_PASS` - Password for admin dashboard access

### Optional Secrets

These are optional but recommended for full functionality:

- `ADMIN_USER` - Admin username (defaults to "admin" if not set)
- `STRIPE_PUBLISHABLE_KEY` - Stripe publishable key for payment processing
- `STRIPE_SECRET_KEY` - Stripe secret key for server-side payment processing
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook secret for event verification
- `DB_PASSWORD` - Database password (defaults to "postgres123" if not set)

### Secret Value Requirements

| Secret | Format/Requirements | How to Generate |
|--------|---------------------|-----------------|
| `EMAIL_USER` | Valid email address | Use your Gmail address |
| `EMAIL_APP_PASSWORD` | 16 characters, no spaces | [Generate Gmail App Password](#generating-gmail-app-password) |
| `JWT_SECRET` | 64+ random characters | `openssl rand -base64 64` |
| `ADMIN_PASS` | Strong password | Use a password generator |
| `STRIPE_*` | Keys from Stripe dashboard | [Get Stripe Test Keys](#getting-stripe-test-keys) |

---

## Usage Instructions

### Linux/Mac Setup

1. **Navigate to Project Directory**
   ```bash
   cd /path/to/Professional-Website
   ```

2. **Run the Setup Script**
   ```bash
   ./scripts/setup-dev-env.sh
   ```

3. **Follow the Prompts**
   - Enter your Bitwarden master password when prompted
   - The script will:
     - Check if Bitwarden CLI is installed
     - Login to Bitwarden (if needed)
     - Unlock your vault
     - Retrieve secrets from the item
     - Generate `contact-backend/.env` file
     - Lock your vault for security

4. **Verify Setup**
   ```bash
   ./scripts/validate-env.sh
   ```

### Windows Setup

1. **Open PowerShell**
   - Right-click Start menu → Windows PowerShell
   - Or press `Win + X` → Windows PowerShell

2. **Navigate to Project Directory**
   ```powershell
   cd C:\path\to\Professional-Website
   ```

3. **Run the Setup Script**
   ```powershell
   .\scripts\setup-dev-env.ps1
   ```

4. **Follow the Prompts**
   - Enter your Bitwarden master password when prompted
   - The script will:
     - Check if Bitwarden CLI is installed
     - Login to Bitwarden (if needed)
     - Unlock your vault
     - Retrieve secrets from the item
     - Generate `contact-backend\.env` file
     - Lock your vault for security

5. **Verify Setup** (Optional - Windows validation coming soon)
   ```powershell
   # Manual verification
   Get-Content contact-backend\.env
   ```

---

## Validation

After running the setup script, validate your environment:

### Automated Validation (Linux/Mac)

```bash
./scripts/validate-env.sh
```

This script checks:
- ✅ All required variables are set
- ✅ Email format is valid
- ✅ Stripe keys have correct format
- ✅ JWT secret meets minimum length requirements
- ✅ .env file exists and is readable

### Manual Validation

1. **Check .env File Exists**
   ```bash
   ls -la contact-backend/.env
   ```

2. **Verify Contents** (do not share this output!)
   ```bash
   cat contact-backend/.env
   ```

3. **Test Backend Startup**
   ```bash
   cd contact-backend
   npm install
   npm start
   ```

If the backend starts without errors, your environment is correctly configured!

---

## Troubleshooting

### Common Issues and Solutions

#### 1. "Bitwarden CLI not found"

**Cause**: Bitwarden CLI is not installed or not in PATH

**Solution**:
- Install Bitwarden CLI (see [Prerequisites](#prerequisites))
- Verify installation: `bw --version`
- On Windows, restart PowerShell after installation

#### 2. "Bitwarden item not found"

**Cause**: The item name doesn't match or item doesn't exist

**Solution**:
- Verify item exists in web vault: [https://vault.bitwarden.com](https://vault.bitwarden.com)
- Check item name is exactly: `Professional-Website-Dev-Secrets`
- Item names are case-sensitive!
- Run `bw sync` to ensure local cache is up-to-date

#### 3. "Failed to unlock vault"

**Cause**: Incorrect master password or vault already locked

**Solution**:
- Double-check your master password
- Try logging in again: `bw logout` then `bw login`
- Check Bitwarden service status: [https://status.bitwarden.com](https://status.bitwarden.com)

#### 4. "Missing required secrets"

**Cause**: Custom fields not set in Bitwarden item

**Solution**:
- Open the item in Bitwarden web vault
- Verify all required custom fields are present (see [Creating the Bitwarden Item](#creating-the-bitwarden-item))
- Field names must match exactly (case-sensitive)
- Save the item and run `bw sync`

#### 5. "Email authentication failed"

**Cause**: Using regular Gmail password instead of app password

**Solution**:
- Generate a Gmail App Password (see below)
- Use the 16-character app password, not your regular password
- Ensure 2-Factor Authentication is enabled on your Gmail account

#### 6. "Permission denied" (Linux/Mac)

**Cause**: Script is not executable

**Solution**:
```bash
chmod +x scripts/setup-dev-env.sh
chmod +x scripts/validate-env.sh
```

#### 7. "jq: command not found" (Linux/Mac)

**Cause**: jq JSON processor is not installed

**Solution**:
- macOS: `brew install jq`
- Ubuntu/Debian: `sudo apt-get install jq`
- RHEL/CentOS: `sudo yum install jq`

---

## Security Best Practices

### DO ✅

1. **Use Strong Master Password**
   - Use a unique, strong password for your Bitwarden account
   - Never share your master password
   - Consider using a passphrase (e.g., "correct-horse-battery-staple" style)

2. **Enable Two-Factor Authentication**
   - Enable 2FA on your Bitwarden account
   - Use an authenticator app (not SMS)

3. **Lock Your Vault**
   - The scripts automatically lock your vault after use
   - Manually lock: `bw lock`
   - Set auto-lock timeout in Bitwarden settings

4. **Use Different Secrets for Each Environment**
   - Development secrets should differ from production
   - Use test keys (Stripe, etc.) in development
   - Never use production credentials locally

5. **Regularly Rotate Secrets**
   - Change passwords and keys periodically
   - Rotate immediately if you suspect compromise
   - Update both Bitwarden item and deployed environments

6. **Backup Your Vault**
   - Export your Bitwarden vault periodically
   - Store encrypted exports in a safe location
   - Use a strong password for exports

7. **Review Access Logs**
   - Monitor your Bitwarden account for unusual activity
   - Check login history regularly

### DON'T ❌

1. **Never Commit Secrets to Git**
   - The `.env` file is in `.gitignore` - keep it there!
   - Don't commit `.env`, `.env.local`, or any secret files
   - Use `git status` before committing to verify

2. **Never Share .env Files**
   - Don't send .env files via email, Slack, or messaging apps
   - Use Bitwarden sharing features instead
   - Don't screenshot or copy-paste secrets in plain text

3. **Never Use Production Secrets Locally**
   - Always use test/development credentials
   - Production secrets should only exist in production environment
   - Keep test and production accounts completely separate

4. **Never Log Secrets**
   - Don't add console.log() or print statements with secrets
   - Be careful with error messages that might expose secrets
   - Sanitize logs before sharing for debugging

5. **Never Store Secrets in Code**
   - Don't hardcode secrets in source files
   - Don't commit commented-out secrets
   - Use environment variables for all secrets

6. **Never Share Your Master Password**
   - Not even with team members
   - Not even with "Bitwarden support" (they will never ask)
   - Use Bitwarden organization features for team sharing

---

## Generating Required Secrets

### Generating Gmail App Password

1. **Enable 2-Factor Authentication**
   - Go to [Google Account Security](https://myaccount.google.com/security)
   - Enable 2-Step Verification if not already enabled

2. **Generate App Password**
   - Go to [App Passwords](https://myaccount.google.com/apppasswords)
   - Select app: "Mail"
   - Select device: "Other" → Enter "Professional Website"
   - Click "Generate"
   - Copy the 16-character password (remove spaces)

3. **Add to Bitwarden**
   - Store the app password in the `EMAIL_APP_PASSWORD` field
   - Note: This is NOT your regular Gmail password!

### Getting Stripe Test Keys

1. **Create Stripe Account**
   - Sign up at [https://stripe.com](https://stripe.com)
   - No credit card required for test mode

2. **Access Test Keys**
   - Go to [Stripe Dashboard](https://dashboard.stripe.com/test/apikeys)
   - Ensure "Test mode" toggle is ON (top right)
   - Copy your keys:
     - **Publishable key**: Starts with `pk_test_`
     - **Secret key**: Starts with `sk_test_` (click "Reveal" to see)

3. **Get Webhook Secret** (Optional)
   - Go to [Webhooks](https://dashboard.stripe.com/test/webhooks)
   - Create a new endpoint (or use existing)
   - Copy the signing secret (starts with `whsec_`)

4. **Add to Bitwarden**
   - Store keys in respective fields in Bitwarden item

### Generating JWT Secret

**Linux/Mac**:
```bash
openssl rand -base64 64
```

**PowerShell (Windows)**:
```powershell
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 64 | ForEach-Object {[char]$_})
```

**Online** (use a reputable generator):
- [RandomKeygen](https://randomkeygen.com/) - Select "Fort Knox Passwords"
- Generate a 64+ character random string

---

## FAQ

### Q: Can I use this with a team?

**A:** Yes! Use Bitwarden Organizations to share the secret item with your team. Each team member can then run the setup script to retrieve the secrets.

### Q: What if I lose my Bitwarden master password?

**A:** Bitwarden uses zero-knowledge encryption, so if you lose your master password, your vault cannot be recovered. Always:
- Keep your master password in a safe place
- Use the emergency access feature
- Export your vault periodically as a backup

### Q: Do I need to run the setup script every time?

**A:** No, only run it:
- On a new machine
- After secrets have been updated in Bitwarden
- If your `.env` file is deleted or corrupted

### Q: Can I use a different item name?

**A:** Yes, but you'll need to modify the scripts:
- Edit `BITWARDEN_ITEM_NAME` in `setup-dev-env.sh`
- Edit `$BitwardenItemName` in `setup-dev-env.ps1`

### Q: Is my vault data secure?

**A:** Yes! Bitwarden uses:
- AES-256 bit encryption
- PBKDF2 SHA-256 key derivation
- Zero-knowledge architecture (even Bitwarden can't access your data)
- Open-source code (auditable)

### Q: How do I update a secret?

**A:** 
1. Update the field value in Bitwarden (web vault or CLI)
2. Sync: `bw sync`
3. Re-run the setup script: `./scripts/setup-dev-env.sh`
4. Restart your development servers

### Q: Can I use this for production?

**A:** This system is designed for development environments. For production:
- Use Kubernetes Secrets (already configured in this project)
- Use cloud provider secret managers (AWS Secrets Manager, Azure Key Vault, etc.)
- Never retrieve production secrets to local development machines

### Q: What if I don't want to use Bitwarden?

**A:** You can:
- Manually create the `.env` file using the template: `contact-backend/.env.template`
- Use another password manager
- Modify the scripts to work with your preferred solution

---

## Additional Resources

- [Bitwarden Official Documentation](https://bitwarden.com/help/)
- [Bitwarden CLI Documentation](https://bitwarden.com/help/cli/)
- [Gmail App Passwords Guide](https://support.google.com/accounts/answer/185833)
- [Stripe API Keys Guide](https://stripe.com/docs/keys)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)

---

## Support

If you encounter issues not covered in this guide:

1. Check the [Troubleshooting](#troubleshooting) section
2. Review the [FAQ](#faq)
3. Check existing GitHub issues
4. Create a new issue with:
   - Your operating system
   - Bitwarden CLI version (`bw --version`)
   - Error message (sanitize any sensitive data!)
   - Steps to reproduce

---

**Remember**: Keep your secrets secure! When in doubt, treat all credentials as highly sensitive and never share them in plain text.
