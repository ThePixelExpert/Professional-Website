#!/usr/bin/env node

/**
 * Production Security Validation Script
 * Scans codebase for security vulnerabilities before deployment
 */

const fs = require('fs');
const path = require('path');

class SecurityValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.checks = 0;
  }

  log(level, message, file = null, line = null) {
    const entry = { level, message, file, line };
    if (level === 'error') {
      this.errors.push(entry);
    } else if (level === 'warning') {
      this.warnings.push(entry);
    }
    console.log(`[${level.toUpperCase()}] ${message}${file ? ` (${file}${line ? `:${line}` : ''})` : ''}`);
  }

  async scanFile(filePath) {
    if (!fs.existsSync(filePath)) return;
    
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      const lineNumber = index + 1;
      
      // Check for hardcoded secrets
      if (this.containsSecret(line)) {
        this.log('error', 'Hardcoded secret detected', filePath, lineNumber);
      }
      
      // Check for localhost URLs
      if (line.match(/localhost:\d{4}/)) {
        this.log('warning', 'Localhost URL found (should use env vars)', filePath, lineNumber);
      }
      
      // Check for test Stripe keys
      if (line.match(/pk_test_|sk_test_/)) {
        this.log('error', 'Test Stripe key found in source', filePath, lineNumber);
      }
      
      // Check for debug logging
      if (line.match(/console\.(log|debug|info).*(?:password|secret|key|token)/i)) {
        this.log('error', 'Debug logging of sensitive data', filePath, lineNumber);
      }
      
      // Check for weak passwords
      if (line.match(/password.*=.*["'].{1,8}["']/i)) {
        this.log('error', 'Weak password detected', filePath, lineNumber);
      }
      
      this.checks++;
    });
  }

  containsSecret(line) {
    const secretPatterns = [
      /password\s*[:=]\s*["'][^"']{1,}["']/i,
      /secret\s*[:=]\s*["'][^"']{1,}["']/i,
      /api[_-]?key\s*[:=]\s*["'][^"']{1,}["']/i,
      /jwt[_-]?secret\s*[:=]\s*["'][^"']{1,}["']/i
    ];
    
    return secretPatterns.some(pattern => pattern.test(line));
  }

  async scanDirectory(dirPath) {
    if (!fs.existsSync(dirPath)) return;
    
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      if (entry.isDirectory()) {
        // Skip node_modules and other irrelevant directories
        if (!['node_modules', '.git', 'build', 'dist'].includes(entry.name)) {
          await this.scanDirectory(fullPath);
        }
      } else if (entry.isFile()) {
        // Scan relevant file types
        const ext = path.extname(entry.name);
        if (['.js', '.jsx', '.ts', '.tsx', '.json', '.yaml', '.yml', '.env'].includes(ext)) {
          await this.scanFile(fullPath);
        }
      }
    }
  }

  checkEnvironmentFiles() {
    const envFiles = [
      '.env',
      '.env.local', 
      '.env.development',
      '.env.production',
      'contact-backend/.env'
    ];
    
    envFiles.forEach(file => {
      if (fs.existsSync(file)) {
        this.log('error', 'Environment file found in repository', file);
      }
    });
  }

  checkKubernetesSecrets() {
    const k8sFiles = [
      'k8s/backend/secret.yaml',
      'k8s/database/postgres-deployment.yaml'
    ];
    
    k8sFiles.forEach(file => {
      if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, 'utf8');
        if (content.includes('cG9zdGdyZXMxMjM=')) {
          this.log('error', 'Default PostgreSQL password found', file);
        }
        if (content.includes('<REPLACE_WITH')) {
          this.log('warning', 'Template values not replaced', file);
        }
      }
    });
  }

  async run() {
    console.log('🔒 Edwards Engineering Security Validation');
    console.log('==========================================');
    
    // Check for environment files
    this.checkEnvironmentFiles();
    
    // Check Kubernetes configurations
    this.checkKubernetesSecrets();
    
    // Scan source code
    console.log('\n📁 Scanning source code...');
    await this.scanDirectory('./src');
    await this.scanDirectory('./contact-backend');
    
    // Scan configuration files
    console.log('\n⚙️ Scanning configuration files...');
    await this.scanFile('package.json');
    await this.scanFile('contact-backend/package.json');
    
    // Report results
    this.reportResults();
    
    return this.errors.length === 0;
  }

  reportResults() {
    console.log('\n📊 Security Scan Results');
    console.log('========================');
    console.log(`Total checks performed: ${this.checks}`);
    console.log(`Errors found: ${this.errors.length}`);
    console.log(`Warnings found: ${this.warnings.length}`);
    
    if (this.errors.length > 0) {
      console.log('\n❌ CRITICAL ISSUES (Must fix before deployment):');
      this.errors.forEach(error => {
        console.log(`   • ${error.message}${error.file ? ` (${error.file}${error.line ? `:${error.line}` : ''})` : ''}`);
      });
    }
    
    if (this.warnings.length > 0) {
      console.log('\n⚠️ WARNINGS (Recommended to fix):');
      this.warnings.forEach(warning => {
        console.log(`   • ${warning.message}${warning.file ? ` (${warning.file}${warning.line ? `:${warning.line}` : ''})` : ''}`);
      });
    }
    
    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log('\n✅ No security issues found! Ready for production deployment.');
    } else if (this.errors.length === 0) {
      console.log('\n✅ No critical security issues found. Review warnings before deployment.');
    } else {
      console.log('\n❌ CRITICAL SECURITY ISSUES FOUND! DO NOT DEPLOY TO PRODUCTION!');
      console.log('Please fix all errors before attempting deployment.');
    }
  }
}

// Run the security validation
if (require.main === module) {
  const validator = new SecurityValidator();
  validator.run().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Security validation failed:', error);
    process.exit(1);
  });
}

module.exports = SecurityValidator;