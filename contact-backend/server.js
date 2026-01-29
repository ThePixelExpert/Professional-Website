require('dotenv').config();

const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const cookieParser = require('cookie-parser');

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const PDFReceiptGenerator = require('./pdf-generator');

const { db, initializeDatabase } = require('./database');
const { requireAdmin } = require('./src/middleware/requireAdmin');
const { createClient } = require('./src/lib/supabase-ssr');

const app = express();
const PORT = process.env.PORT || 3001;
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'password';
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

// Admin Auth Middleware
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
app.use(cookieParser());
app.use('/api/contact', limiter);

// Health check endpoint (required for Kubernetes probes)
app.get('/api/health', async (req, res) => {
  try {
    // Check database connectivity
    const isConnected = await db.testConnection();
    
    if (isConnected) {
      res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        database: 'connected',
        environment: process.env.NODE_ENV || 'development'
      });
    } else {
      res.status(503).json({
        status: 'error',
        timestamp: new Date().toISOString(),
        database: 'disconnected',
        error: 'Database connection test failed'
      });
    }
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: 'Database connection failed'
    });
  }
});

// Email configuration
const transporter = nodemailer.createTransport({
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

        // Send both emails
    await Promise.all([
      transporter.sendMail(notificationEmail),
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

// Admin Login Endpoint
app.post('/api/admin/login', async (req, res) => {
  const { username, password } = req.body;
  
  try {
    // Get admin user from database
    const adminUser = await db.getAdminUser(username);
    
    if (!adminUser) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    
    // Verify password
    const isValidPassword = await bcrypt.compare(password, adminUser.password_hash);
    
    if (isValidPassword) {
      // Update last login
      await db.updateAdminLastLogin(username);
      
      // Create JWT token
      const token = jwt.sign({ 
        username: adminUser.username, 
        id: adminUser.id 
      }, JWT_SECRET, { expiresIn: '2h' });
      
      res.json({ 
        success: true, 
        token,
        user: {
          username: adminUser.username,
          email: adminUser.email,
          lastLogin: adminUser.last_login
        }
      });
    } else {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
  } catch (error) {
    console.error('Error during admin login:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Create Payment Intent for Stripe
app.post('/api/create-payment-intent', async (req, res) => {
  try {
    const { amount, currency = 'usd', orderId, customerInfo } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }

    // Create payment intent with Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Stripe expects cents
      currency: currency,
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        orderId: orderId || '',
        customerName: customerInfo?.name || '',
        customerEmail: customerInfo?.email || '',
      },
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({ error: 'Failed to create payment intent' });
  }
});

// Stripe Webhook Handler
app.post('/api/stripe-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  // Skip webhook verification if no secret is configured
  if (!endpointSecret) {
    console.log('Webhook configuration incomplete');
    return res.status(200).json({ received: true });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      console.log('Payment succeeded:', paymentIntent.id);
      
      // Update order status in database
      try {
        if (paymentIntent.metadata.orderId) {
          await db.updateOrderPaymentStatus(
            paymentIntent.metadata.orderId,
            'completed',
            paymentIntent.id
          );
          console.log(`Order ${paymentIntent.metadata.orderId} payment confirmed`);
        }
      } catch (dbError) {
        console.error('Error updating order payment status:', dbError);
      }
      break;
      
    case 'payment_intent.payment_failed':
      const failedPayment = event.data.object;
      console.log('Payment failed:', failedPayment.id);
      
      // Update order status to failed
      try {
        if (failedPayment.metadata.orderId) {
          await db.updateOrderPaymentStatus(
            failedPayment.metadata.orderId,
            'failed',
            failedPayment.id
          );
        }
      } catch (dbError) {
        console.error('Error updating failed payment status:', dbError);
      }
      break;
      
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
});

// Create order (enhanced with Stripe integration)
app.post('/api/orders', async (req, res) => {
  console.log('Order endpoint called. Body:', req.body);
  try {
    const { 
      buyerEmail, 
      items, 
      buyerName, 
      buyerPhone,
      shippingAddress,
      billingAddress,
      address, // Legacy support
      paymentIntentId, 
      requiresPayment = false 
    } = req.body;
    
    // Use new address format or fall back to legacy
    const finalShippingAddress = shippingAddress || address || '';
    const finalBillingAddress = billingAddress || finalShippingAddress;
    
    // Calculate totals
    const subtotal = items.reduce((sum, item) => sum + (item.price || 50), 0);
    const tax = subtotal * 0.08; // 8% tax rate
    const total = subtotal + tax;

    // Create order in database
    const order = await db.createOrder({
      customerName: buyerName || '',
      customerEmail: buyerEmail,
      customerPhone: buyerPhone || '',
      customerAddress: finalShippingAddress,
      shippingAddress: finalShippingAddress,
      billingAddress: finalBillingAddress,
      items: items,
      subtotal: subtotal,
      tax: tax,
      total: total
    });

    // Create or update customer
    await db.createOrUpdateCustomer({
      name: buyerName || '',
      email: buyerEmail,
      phone: buyerPhone || '',
      address: finalShippingAddress,
      shippingAddress: finalShippingAddress,
      billingAddress: finalBillingAddress
    });

    // Send confirmation email (don't block order creation if email fails)
    try {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: buyerEmail,
        subject: 'Order Confirmation - Edwards Engineering',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1976d2;">Thank you for your order!</h2>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #333; margin-top: 0;">Order Details</h3>
            <p><strong>Order ID:</strong> ${order.id}</p>
            <p><strong>Customer:</strong> ${order.customer_name}</p>
            <p><strong>Email:</strong> ${order.customer_email}</p>
            ${buyerPhone ? `<p><strong>Phone:</strong> ${buyerPhone}</p>` : ''}
            <p><strong>Status:</strong> ${order.status}</p>
          </div>

          <div style="background: #fff; padding: 20px; border: 1px solid #ddd; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #333; margin-top: 0;">Shipping Information</h3>
            <p><strong>Shipping Address:</strong><br>${finalShippingAddress}</p>
            ${finalBillingAddress !== finalShippingAddress ? 
              `<p><strong>Billing Address:</strong><br>${finalBillingAddress}</p>` : 
              '<p><em>Billing address same as shipping</em></p>'
            }
          </div>

          <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #1976d2; margin-top: 0;">Order Summary</h3>
            <p><strong>Subtotal:</strong> $${order.subtotal.toFixed(2)}</p>
            <p><strong>Tax:</strong> $${order.tax.toFixed(2)}</p>
            <p style="font-size: 1.2em;"><strong>Total:</strong> $${order.total.toFixed(2)}</p>
          </div>

          <p>You will receive updates as your order is processed and prepared for shipment.</p>
          
          <p>Questions about your order? Reply to this email or contact us at lmedwards.professional@gmail.com</p>
          
          <p>Best regards,<br>
          <strong>Logan Edwards</strong><br>
          Edwards Engineering</p>
        </div>
      `
      });
      console.log('✅ Order confirmation email sent');
    } catch (emailError) {
      console.error('⚠️ Failed to send order confirmation email:', emailError.message);
      // Continue - order was created successfully even if email failed
    }

    res.json({
      success: true,
      order: {
        id: order.id,
        customerName: order.customer_name,
        customerEmail: order.customer_email,
        items: order.items,
        subtotal: order.subtotal,
        tax: order.tax,
        total: order.total,
        status: order.status,
        createdAt: order.created_at
      }
    });
  } catch (error) {
    console.error('Order creation error:', error);
    res.status(500).json({ error: 'Failed to create order', details: error.message });
  }
});

// List all orders (admin, protected)
app.get('/api/orders', authMiddleware, async (req, res) => {
  try {
    const orders = await db.getOrders();
    res.json(orders.map(order => ({
      id: order.id,
      customerName: order.customer_name,
      customerEmail: order.customer_email,
      customerAddress: order.customer_address,
      items: order.items,
      subtotal: parseFloat(order.subtotal),
      tax: parseFloat(order.tax),
      total: parseFloat(order.total),
      status: order.status,
      paymentStatus: order.payment_status,
      trackingNumber: order.tracking_number,
      createdAt: order.created_at,
      updatedAt: order.updated_at
    })));
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Update order status (admin, protected)
app.put('/api/orders/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, trackingNumber } = req.body;
    
    const updatedOrder = await db.updateOrderStatus(id, status, trackingNumber);
    if (!updatedOrder) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Send status update email

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: updatedOrder.customer_email,
      subject: 'Order Status Update - Edwards Engineering',
      html: `
        <h2>Order Status Update</h2>
        <p><strong>Order ID:</strong> ${updatedOrder.id}</p>
        <p><strong>New Status:</strong> ${updatedOrder.status}</p>
        ${updatedOrder.tracking_number ? `
          <p><strong>Tracking Number:</strong> ${updatedOrder.tracking_number}</p>
          <p><a href="https://www.ups.com/track?tracknum=${updatedOrder.tracking_number}">Track your shipment</a></p>
        ` : ''}
        <p>Thank you for your business!</p>
        <p>Best regards,<br>Edwards Engineering</p>
      `
    });

    res.json({
      id: updatedOrder.id,
      customerName: updatedOrder.customer_name,
      customerEmail: updatedOrder.customer_email,
      status: updatedOrder.status,
      trackingNumber: updatedOrder.tracking_number,
      updatedAt: updatedOrder.updated_at
    });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

// Generate PDF receipt for an order
app.get('/api/orders/:id/receipt', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const order = await db.getOrder(id);
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    const pdfGenerator = new PDFReceiptGenerator();
    const pdfBuffer = await pdfGenerator.generateReceipt(order);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="receipt-${order.id}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({ error: 'Failed to generate PDF receipt' });
  }
});

// Send PDF receipt via email
app.post('/api/orders/:id/send-receipt', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const order = await db.getOrder(id);
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    const pdfGenerator = new PDFReceiptGenerator();
    const pdfBuffer = await pdfGenerator.generateReceipt(order);
    
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: order.customer_email,
      subject: `Receipt for Order #${order.id} - Edwards Technology Services`,
      html: `
        <h2>Receipt for Your Order</h2>
        <p>Dear ${order.customer_name},</p>
        <p>Please find attached your receipt for order #${order.id}.</p>
        <p><strong>Order Total: $${parseFloat(order.total_amount).toFixed(2)}</strong></p>
        <p>Thank you for your business!</p>
        <p>Best regards,<br>Edwards Technology Services</p>
      `,
      attachments: [{
        filename: `receipt-${order.id}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf'
      }]
    });
    
    res.json({ message: 'Receipt sent successfully' });
  } catch (error) {
    console.error('Send receipt error:', error);
    res.status(500).json({ error: 'Failed to send receipt' });
  }
});

// Customer order tracking - no auth required
app.post('/api/orders/track', async (req, res) => {
  try {
    const { email, orderId } = req.body;
    
    if (!email || !orderId) {
      return res.status(400).json({ error: 'Email and Order ID are required' });
    }
    
    const order = await db.getOrderByIdAndEmail(orderId, email);
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found. Please check your email and order ID.' });
    }
    
    // Return order details (safe subset for customer)
    res.json({
      id: order.id,
      customer_name: order.customer_name,
      customer_email: order.customer_email,
      items: order.items,
      total_amount: order.total_amount,
      status: order.status,
      created_at: order.created_at,
      updated_at: order.updated_at,
      tracking_number: order.tracking_number
    });
  } catch (error) {
    console.error('Order tracking error:', error);
    res.status(500).json({ error: 'Failed to track order' });
  }
});

// Customer receipt download - no auth required but email verification
app.get('/api/orders/:id/customer-receipt', async (req, res) => {
  try {
    const { id } = req.params;
    const { email } = req.query;
    
    if (!email) {
      return res.status(400).json({ error: 'Email parameter is required' });
    }
    
    const order = await db.getOrderByIdAndEmail(id, email);
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    const pdfGenerator = new PDFReceiptGenerator();
    const pdfBuffer = await pdfGenerator.generateReceipt(order);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="receipt-${order.id}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Customer receipt error:', error);
    res.status(500).json({ error: 'Failed to generate receipt' });
  }
});

// Initialize default admin user if it doesn't exist
async function initializeAdminUser() {
  try {
    const existingAdmin = await db.getAdminUser(ADMIN_USER);
    if (!existingAdmin) {
      console.log('🔐 Creating default admin user...');
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(ADMIN_PASS, saltRounds);
      await db.createAdminUser(ADMIN_USER, hashedPassword, 'lmedwards.professional@gmail.com');
      console.log(`✅ Default admin user created: ${ADMIN_USER}`);
    } else {
      console.log(`✅ Admin user already exists: ${ADMIN_USER}`);
    }
  } catch (error) {
    console.error('❌ Error initializing admin user:', error);
  }
}

// Initialize database and start server
async function startServer() {
  // Start server first, then try database connection
  const server = app.listen(PORT, () => {
    console.log(`🚀 Edwards Engineering Contact API running on port ${PORT}`);
    console.log(`📧 Email notifications will be sent to: lmedwards.professional@gmail.com`);
  });

  // Try to connect to database (but don't fail if it's not ready)
  try {
    console.log('🔌 Connecting to database...');
    await db.testConnection();
    
    // Initialize database tables
    await initializeDatabase();
    
    // Initialize default admin user
    await initializeAdminUser();
    
    console.log(`🗄️ Database connection established`);
  } catch (error) {
    console.error('⚠️ Database connection failed (will retry):', error);
    console.log('📝 Server is running but database features may be limited');
    
    // Retry database connection every 10 seconds
    const retryConnection = setInterval(async () => {
      try {
        console.log('🔄 Retrying database connection...');
        await db.testConnection();
        await initializeDatabase();
        await initializeAdminUser();
        console.log('✅ Database connection restored!');
        clearInterval(retryConnection);
      } catch (retryError) {
        console.log('⏳ Database still not ready, will retry in 10 seconds...');
      }
    }, 10000);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Shutting down server...');
  await db.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🛑 Shutting down server...');
  await db.close();
  process.exit(0);
});

// Start the server
startServer();

module.exports = app;
