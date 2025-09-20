# Edwards Engineering Contact Form Setup Guide

## 🚀 Complete Self-Hosted Solution for Nginx

### What I've Set Up:
1. ✅ **Removed Netlify-specific code** from your React app
2. ✅ **Created Node.js/Express backend** with email notifications
3. ✅ **Added rate limiting** and security features
4. ✅ **Nginx configuration** for proxying API requests
5. ✅ **Production-ready setup** with PM2 process manager

---

## 📋 Installation Steps:

### 1. Backend Setup
```bash
# Navigate to backend folder
cd contact-backend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your email credentials
nano .env
```

### 2. Email Configuration
1. Go to [Google Account Settings](https://myaccount.google.com/)
2. Security → 2-Step Verification (enable if not already)
3. App passwords → Generate new app password for "Mail"
4. Put that password in your `.env` file

### 3. Start Backend Server
```bash
# Development mode
npm run dev

# Production mode (recommended)
npm run install-pm2
npm run start-production
```

### 4. Nginx Configuration
```bash
# Edit your nginx config
sudo nano /etc/nginx/sites-available/your-site

# Add the proxy configuration from nginx-config.conf
# Test nginx config
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

### 5. Build and Deploy Frontend
```bash
# In your React app directory
npm run build

# Copy build files to nginx directory
sudo cp -r build/* /var/www/edwards-engineering/
```

---

## 🔧 How It Works:

1. **User submits form** → React sends POST to `/api/contact`
2. **Nginx proxies** → Forwards API requests to Node.js backend (port 3001)
3. **Backend processes** → Validates data, sends emails
4. **Email notifications** → You get instant notification + user gets auto-reply
5. **Rate limiting** → Prevents spam (5 submissions per 15 minutes per IP)

---

## 📧 Email Features:

**You receive:**
- 🔔 Instant notification with all form data
- 📅 Timestamp and contact details
- 💡 Quick reply link
- 🎨 Professional HTML formatting

**User receives:**
- ✅ Confirmation email immediately
- 📋 Summary of their message
- ⏰ 24-hour response promise
- 🔗 Your contact links

---

## 🛡️ Security Features:

- ✅ **Rate limiting** (nginx + express)
- ✅ **CORS protection**
- ✅ **Input validation**
- ✅ **Email validation**
- ✅ **Error handling**

---

## 🔍 Monitoring:

```bash
# Check backend status
npm run logs

# Check if backend is running
curl http://localhost:3001/api/health

# Monitor nginx access
sudo tail -f /var/log/nginx/access.log
```

---

## 🚨 Troubleshooting:

**Form not working?**
1. Check backend is running: `pm2 status`
2. Check nginx config: `sudo nginx -t`
3. Check logs: `npm run logs`
4. Verify email settings in `.env`

**Not receiving emails?**
1. Check Gmail app password is correct
2. Verify email address in server.js
3. Check spam folder
4. Test with: `node -e "console.log(process.env.EMAIL_USER)"`

---

Ready to deploy! Your contact form will now:
- ✅ Work on your self-hosted nginx server
- ✅ Send you instant email notifications
- ✅ Send auto-replies to users
- ✅ Be protected against spam
- ✅ Handle errors gracefully