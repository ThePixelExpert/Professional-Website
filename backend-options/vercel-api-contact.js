// Option 3: Vercel Serverless Function
// Create this file at: /api/contact.js in your project root

const nodemailer = require('nodemailer');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { name, email, company, subject, message } = req.body;

  // Configure email transporter
  const transporter = nodemailer.createTransporter({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_APP_PASSWORD
    }
  });

  try {
    // Email to you (notification)
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: 'lmedwards.professional@gmail.com',
      subject: `New Contact: ${subject || 'Engineering Inquiry'}`,
      html: `
        <h2>New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Company:</strong> ${company || 'N/A'}</p>
        <p><strong>Subject:</strong> ${subject || 'Engineering Inquiry'}</p>
        <p><strong>Message:</strong></p>
        <p>${message.replace(/\n/g, '<br>')}</p>
      `
    });

    // Auto-reply to user
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Thank you for contacting Edwards Engineering',
      html: `
        <h2>Thank you for your inquiry!</h2>
        <p>Hi ${name},</p>
        <p>Thank you for reaching out. I'll get back to you within 24 hours.</p>
        <p>Best regards,<br>Logan Edwards</p>
      `
    });

    res.status(200).json({ success: true, message: 'Message sent successfully!' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, message: 'Failed to send message' });
  }
}