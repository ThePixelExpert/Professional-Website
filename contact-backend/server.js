const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: { success: false, message: 'Too many requests, please try again later.' }
});

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use('/api/contact', limiter);

// Email configuration
const transporter = nodemailer.createTransporter({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD
  }
});

// Verify email configuration on startup
transporter.verify((error, success) => {
  if (error) {
    console.error('Email configuration error:', error);
  } else {
    console.log('Email server is ready');
  }
});

// Contact form endpoint
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, company, subject, message } = req.body;

    // Basic validation
    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and message are required.'
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.'
      });
    }

    const timestamp = new Date().toLocaleString();

    // Email to you (notification)
    const notificationEmail = {
      from: process.env.EMAIL_USER,
      to: 'lmedwards.professional@gmail.com',
      subject: `🔔 New Contact Form: ${subject || 'Engineering Inquiry'}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1976d2; border-bottom: 2px solid #1976d2; padding-bottom: 10px;">
            New Contact Form Submission
          </h2>
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>📅 Date:</strong> ${timestamp}</p>
            <p><strong>👤 Name:</strong> ${name}</p>
            <p><strong>📧 Email:</strong> <a href="mailto:${email}">${email}</a></p>
            <p><strong>🏢 Company:</strong> ${company || 'Not provided'}</p>
            <p><strong>📋 Subject:</strong> ${subject || 'Engineering Inquiry'}</p>
          </div>
          <div style="background: #fff; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
            <p><strong>💬 Message:</strong></p>
            <p style="white-space: pre-wrap; line-height: 1.6;">${message}</p>
          </div>
          <div style="margin-top: 20px; padding: 15px; background: #e3f2fd; border-radius: 8px;">
            <p style="margin: 0; font-size: 14px; color: #1976d2;">
              💡 Quick Reply: <a href="mailto:${email}?subject=Re: ${subject || 'Your inquiry'}&body=Hi ${name},%0D%0A%0D%0AThank you for reaching out...">Click here to reply</a>
            </p>
          </div>
        </div>
      `
    };

    // Auto-reply to user
    const autoReply = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Thank you for contacting Edwards Engineering',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1976d2;">Thank you for your inquiry!</h2>
          <p>Hi ${name},</p>
          <p>Thank you for reaching out to Edwards Engineering. I've received your message and will get back to you within 24 hours.</p>
          
          <div style="background: #f5f5f5; padding: 15px; border-left: 4px solid #1976d2; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #333;">Your Message Summary:</h3>
            <p><strong>Subject:</strong> ${subject || 'Engineering Inquiry'}</p>
            <p><strong>Message:</strong> ${message.substring(0, 200)}${message.length > 200 ? '...' : ''}</p>
          </div>
          
          <p>In the meantime, feel free to:</p>
          <ul>
            <li>📧 Reply to this email with any additional details</li>
            <li>💼 Check out my <a href="https://www.linkedin.com/in/logan-edwards-76bb91282/">LinkedIn profile</a></li>
            <li>📱 Call me for urgent matters (available upon request)</li>
          </ul>
          
          <p>Best regards,<br>
          <strong>Logan Edwards</strong><br>
          Edwards Engineering<br>
          <a href="mailto:lmedwards.professional@gmail.com">lmedwards.professional@gmail.com</a></p>
        </div>
      `
    };

    // Send both emails
    await Promise.all([
      transporter.sendMail(notificationEmail),
      transporter.sendMail(autoReply)
    ]);

    // Log successful submission (optional - for your records)
    console.log(`✅ Contact form submission from ${name} (${email}) at ${timestamp}`);

    res.status(200).json({ 
      success: true, 
      message: 'Your message has been sent successfully! You should receive a confirmation email shortly.' 
    });

  } catch (error) {
    console.error('❌ Error processing contact form:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Sorry, there was an error sending your message. Please try again in a few minutes.' 
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Edwards Engineering Contact API running on port ${PORT}`);
  console.log(`📧 Email notifications will be sent to: lmedwards.professional@gmail.com`);
});

module.exports = app;