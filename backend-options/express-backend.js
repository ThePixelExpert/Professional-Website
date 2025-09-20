// Option 2: Express.js Backend with Email Notifications
// To use this, create a new folder for your backend and run:
// npm init -y
// npm install express cors nodemailer dotenv

const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Email configuration
const transporter = nodemailer.createTransporter({
  service: 'gmail', // or your email service
  auth: {
    user: process.env.EMAIL_USER, // your email
    pass: process.env.EMAIL_APP_PASSWORD // your app password
  }
});

// Contact form endpoint
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, company, subject, message } = req.body;

    // Email to you (notification)
    const notificationEmail = {
      from: process.env.EMAIL_USER,
      to: 'lmedwards.professional@gmail.com',
      subject: `New Contact Form Submission: ${subject || 'Engineering Inquiry'}`,
      html: `
        <h2>New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Company:</strong> ${company || 'N/A'}</p>
        <p><strong>Subject:</strong> ${subject || 'Engineering Inquiry'}</p>
        <p><strong>Message:</strong></p>
        <p>${message.replace(/\n/g, '<br>')}</p>
        <hr>
        <p><small>Sent from Edwards Engineering website contact form</small></p>
      `
    };

    // Auto-reply to user
    const autoReply = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Thank you for contacting Edwards Engineering',
      html: `
        <h2>Thank you for your inquiry!</h2>
        <p>Hi ${name},</p>
        <p>Thank you for reaching out to Edwards Engineering. I've received your message and will get back to you within 24 hours.</p>
        <p>Here's a copy of your message:</p>
        <blockquote style="background: #f5f5f5; padding: 15px; border-left: 4px solid #1976d2;">
          <p><strong>Subject:</strong> ${subject || 'Engineering Inquiry'}</p>
          <p><strong>Message:</strong> ${message}</p>
        </blockquote>
        <p>Best regards,<br>Logan Edwards<br>Edwards Engineering</p>
      `
    };

    // Send both emails
    await transporter.sendMail(notificationEmail);
    await transporter.sendMail(autoReply);

    res.status(200).json({ 
      success: true, 
      message: 'Your message has been sent successfully!' 
    });

  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Sorry, there was an error sending your message.' 
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;