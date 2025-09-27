// ...existing code...
// Option 2: Express.js Backend with Email Notifications
// To use this, create a new folder for your backend and run:
// npm init -y
// npm install express cors nodemailer dotenv

const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'password';
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

// Middleware
app.use(cors());
app.use(express.json());

// Simple ping endpoint for connectivity testing
app.get('/api/ping', (req, res) => {
  console.log('Ping received');
  res.json({ ok: true });
});


// Email configuration
const transporter = nodemailer.createTransport({
  service: 'gmail', // or your email service
  auth: {
    user: process.env.EMAIL_USER, // your email
    pass: process.env.EMAIL_APP_PASSWORD // your app password
  }
});

// --- Admin Auth Middleware ---
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token provided' });
  const token = authHeader.split(' ')[1];
  try {
    jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// --- Admin Login Endpoint ---
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '2h' });
    res.json({ success: true, token });
  } else {
    res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
});


// Contact form endpoint (existing)
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, company, subject, message } = req.body;
    // Email to you (notification)
    const notificationEmail = {
      from: process.env.EMAIL_USER,
      to: 'lmedwards.professional@gmail.com',
      subject: `New Contact Form Submission: ${subject || 'Engineering Inquiry'}`,
      html: `<h2>New Contact Form Submission</h2><p><strong>Name:</strong> ${name}</p><p><strong>Email:</strong> ${email}</p><p><strong>Company:</strong> ${company || 'N/A'}</p><p><strong>Subject:</strong> ${subject || 'Engineering Inquiry'}</p><p><strong>Message:</strong></p><p>${message.replace(/\n/g, '<br>')}</p><hr><p><small>Sent from Edwards Engineering website contact form</small></p>`
    };
    // Auto-reply to user
    const autoReply = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Thank you for contacting Edwards Engineering',
      html: `<h2>Thank you for your inquiry!</h2><p>Hi ${name},</p><p>Thank you for reaching out to Edwards Engineering. I've received your message and will get back to you within 24 hours.</p><p>Here's a copy of your message:</p><blockquote style="background: #f5f5f5; padding: 15px; border-left: 4px solid #1976d2;"><p><strong>Subject:</strong> ${subject || 'Engineering Inquiry'}</p><p><strong>Message:</strong> ${message}</p></blockquote><p>Best regards,<br>Logan Edwards<br>Edwards Engineering</p>`
    };
    await transporter.sendMail(notificationEmail);
    await transporter.sendMail(autoReply);
    res.status(200).json({ success: true, message: 'Your message has been sent successfully!' });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ success: false, message: 'Sorry, there was an error sending your message.' });
  }
});

// --- Order Management API ---
let orders = [];

// Create order
const fs = require('fs');
const path = require('path');

app.post('/api/orders', async (req, res) => {
  console.log('Order endpoint called. Body:', req.body);
  try {
    const { buyerEmail, items, trackingNumber, buyerName, address } = req.body;
    const order = {
      id: Date.now().toString(),
      buyerEmail,
      items,
      status: 'pending',
      trackingNumber: trackingNumber || '',
      buyerName: buyerName || '',
      address: address || '',
      createdAt: new Date()
    };
    orders.push(order);

    // Write to CSV for safety
    const csvPath = path.join(__dirname, 'orders-backup.csv');
    const csvHeader = 'id,buyerEmail,buyerName,address,items,status,trackingNumber,createdAt\n';
    const csvRow = `"${order.id}","${order.buyerEmail}","${order.buyerName}","${order.address}","${JSON.stringify(order.items)}","${order.status}","${order.trackingNumber}","${order.createdAt.toISOString()}"\n`;
    if (!fs.existsSync(csvPath)) {
      fs.writeFileSync(csvPath, csvHeader);
    }
    fs.appendFileSync(csvPath, csvRow);

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: buyerEmail,
      subject: 'Order Received',
      text: `Your order is pending. Order ID: ${order.id}`
    });
    res.json(order);
  } catch (error) {
    console.error('Order creation error:', error);
    res.status(500).json({ error: 'Failed to create order', details: error.message });
  }
});

// List all orders (admin, protected)
app.get('/api/orders', authMiddleware, (req, res) => {
  res.json(orders);
});

// Update order status (admin, protected)
app.put('/api/orders/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, trackingNumber } = req.body;
    const order = orders.find(o => o.id === id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (status) order.status = status;
    if (typeof trackingNumber !== 'undefined') order.trackingNumber = trackingNumber;
    let emailText = `Your order status is now: ${order.status}`;
    if (order.trackingNumber) {
      emailText += `\nTracking Number: ${order.trackingNumber}`;
      emailText += `\nTrack your shipment at: https://www.ups.com/track?tracknum=${order.trackingNumber}`;
    }
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: order.buyerEmail,
      subject: 'Order Status Updated',
      text: emailText
    });
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;