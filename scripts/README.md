# Development Scripts

This directory contains automation scripts for managing the development environment.

## 🔐 Secret Management Scripts

### `setup-dev-env.sh` (Linux/Mac)

Automatically retrieves development secrets from Bitwarden and generates `.env` files.

**Usage:**
```bash
./scripts/setup-dev-env.sh
```

**Features:**
- ✅ Checks Bitwarden CLI installation
- ✅ Handles authentication automatically
- ✅ Retrieves secrets securely
- ✅ Generates `contact-backend/.env`
- ✅ Validates all required secrets
- ✅ Locks vault after completion

---

### `setup-dev-env.ps1` (Windows)

PowerShell version of the setup script for Windows environments.

**Usage:**
```powershell
.\scripts\setup-dev-env.ps1
```

**Features:**
- ✅ Same functionality as bash version
- ✅ Native PowerShell integration
- ✅ Works on Windows 10/11

---

### `validate-env.sh` (Linux/Mac)

Validates that all required environment variables are properly configured.

**Usage:**
```bash
./scripts/validate-env.sh
```

**Checks:**
- ✅ .env file exists
- ✅ Required variables are set
- ✅ Email format validation
- ✅ Stripe key format validation
- ✅ JWT secret length validation

---

## 📚 Documentation

For detailed setup instructions, see: **[docs/SECRET_MANAGEMENT.md](../docs/SECRET_MANAGEMENT.md)**

## 🚀 Quick Start

1. **Install Bitwarden CLI** (if not already installed)
   ```bash
   # macOS
   brew install bitwarden-cli
   
   # Linux
   snap install bw
   
   # Windows
   choco install bitwarden-cli
   ```

2. **Run the setup script**
   ```bash
   # Linux/Mac
   ./scripts/setup-dev-env.sh
   
   # Windows
   .\scripts\setup-dev-env.ps1
   ```

3. **Validate your setup**
   ```bash
   ./scripts/validate-env.sh
   ```

4. **Start development**
   ```bash
   # Backend
   cd contact-backend && npm start
   
   # Frontend (new terminal)
   npm start
   ```

---

## ⚠️ Important Notes

- Scripts automatically lock Bitwarden vault after use for security
- Generated `.env` files are in `.gitignore` and will never be committed
- All scripts include comprehensive error handling and helpful messages
- For troubleshooting, see [docs/SECRET_MANAGEMENT.md](../docs/SECRET_MANAGEMENT.md)

---

## 🔧 Script Requirements

### Bash Scripts
- Bash 4.0+
- Bitwarden CLI (`bw`)
- jq (JSON processor)
- curl (for API calls)

### PowerShell Scripts
- PowerShell 5.1+ or PowerShell Core 7+
- Bitwarden CLI (`bw`)
