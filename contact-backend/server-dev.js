require('dotenv').config({ path: '.env.local' });

const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const PDFReceiptGenerator = require('./pdf-generator');

const app = express();
const PORT = process.env.PORT || 3001;
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'password';
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

// In-memory database for development
let orders = [
  {
    id: '1703456789123',
    customer_name: 'John Doe',
    customer_email: 'john.doe@example.com',
    customer_phone: '(555) 123-4567',
    billing_address: JSON.stringify({
      street: '123 Tech Street',
      city: 'San Francisco',
      state: 'CA',
      zip: '94105'
    }),
    shipping_address: JSON.stringify({
      street: '123 Tech Street',
      city: 'San Francisco',
      state: 'CA',
      zip: '94105'
    }),
    items: [
      { name: 'Custom Engineering Project', price: 299.99 },
      { name: 'Technical Consultation', price: 150.00 }
    ],
    total_amount: '449.99',
    payment_intent_id: 'pi_test_1234567890',
    status: 'shipped',
    created_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    updated_at: new Date().toISOString(),
    tracking_number: 'UPS123456789',
    notes: 'Sample order for testing'
  },
  {
    id: '1703456789124',
    customer_name: 'Jane Smith',
    customer_email: 'jane.smith@example.com',
    customer_phone: '(555) 987-6543',
    billing_address: JSON.stringify({
      street: '456 Innovation Ave',
      city: 'Austin',
      state: 'TX',
      zip: '73301'
    }),
    shipping_address: JSON.stringify({
      street: '456 Innovation Ave',
      city: 'Austin',
      state: 'TX',
      zip: '73301'
    }),
    items: [
      { name: 'Circuit Design & PCB Development', price: 599.99 },
      { name: 'Prototype Development', price: 399.99 }
    ],
    total_amount: '999.98',
    payment_intent_id: 'pi_test_1234567891',
    status: 'processing',
    created_at: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
    updated_at: new Date(Date.now() - 86400000).toISOString(),
    tracking_number: null,
    notes: 'Priority client project'
  },
  {
    id: '1703456789125',
    customer_name: 'Mike Johnson',
    customer_email: 'mike.johnson@techcorp.com',
    customer_phone: '(555) 456-7890',
    billing_address: JSON.stringify({
      street: '789 Corporate Blvd',
      city: 'Seattle',
      state: 'WA',
      zip: '98101'
    }),
    shipping_address: JSON.stringify({
      street: '789 Corporate Blvd',
      city: 'Seattle',
      state: 'WA',
      zip: '98101'
    }),
    items: [
      { name: 'System Integration', price: 1299.99 },
      { name: 'Technical Consultation', price: 200.00 }
    ],
    total_amount: '1499.99',
    payment_intent_id: 'pi_test_1234567892',
    status: 'delivered',
    created_at: new Date(Date.now() - 604800000).toISOString(), // 1 week ago
    updated_at: new Date(Date.now() - 259200000).toISOString(), // 3 days ago
    tracking_number: 'FEDEX987654321',
    notes: 'Repeat customer - enterprise contract'
  },
  {
    id: '1703456789126',
    customer_name: 'Sarah Wilson',
    customer_email: 'sarah.wilson@startup.io',
    customer_phone: '(555) 321-0987',
    billing_address: JSON.stringify({
      street: '321 Startup Lane',
      city: 'Boulder',
      state: 'CO',
      zip: '80301'
    }),
    shipping_address: JSON.stringify({
      street: '321 Startup Lane',
      city: 'Boulder',
      state: 'CO',
      zip: '80301'
    }),
    items: [
      { name: 'Prototype Development', price: 799.99 }
    ],
    total_amount: '799.99',
    payment_intent_id: 'pi_test_1234567893',
    status: 'pending',
    created_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    updated_at: new Date(Date.now() - 3600000).toISOString(),
    tracking_number: null,
    notes: 'New customer - IoT device project'
  },
  {
    id: '1703456789127',
    customer_name: 'David Chen',
    customer_email: 'david.chen@engineering.com',
    customer_phone: '(555) 654-3210',
    billing_address: JSON.stringify({
      street: '654 Engineering Park',
      city: 'San Jose',
      state: 'CA',
      zip: '95110'
    }),
    shipping_address: JSON.stringify({
      street: '654 Engineering Park',
      city: 'San Jose',
      state: 'CA',
      zip: '95110'
    }),
    items: [
      { name: 'Custom Engineering Project', price: 1899.99 },
      { name: 'Technical Consultation', price: 300.00 },
      { name: 'Circuit Design & PCB Development', price: 499.99 }
    ],
    total_amount: '2699.98',
    payment_intent_id: 'pi_test_1234567894',
    status: 'shipped',
    created_at: new Date(Date.now() - 1209600000).toISOString(), // 2 weeks ago
    updated_at: new Date(Date.now() - 432000000).toISOString(), // 5 days ago
    tracking_number: 'UPS555666777',
    notes: 'Large scale automation project'
  }
];

let adminUsers = [{
  id: 1,
  username: ADMIN_USER,
  email: 'admin@edwardstech.dev',
  password: bcrypt.hashSync(ADMIN_PASS, 10),
  last_login: null
}];

// Middleware
app.use(cors());
app.use(express.json());

// Trust proxy for rate limiting
app.set('trust proxy', 1);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Auth Middleware
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

// Email configuration
let transporter;
if (process.env.EMAIL_USER && process.env.EMAIL_APP_PASSWORD) {
  transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_APP_PASSWORD
    }
  });
  console.log('📧 Email notifications will be sent to:', process.env.EMAIL_USER);
} else {
  console.log('⚠️ Email not configured - emails will be logged to console');
}

// Helper function to send emails (or log them in dev)
async function sendEmail(options) {
  try {
    if (transporter) {
      await transporter.sendMail(options);
      console.log(`✅ Email sent to ${options.to}`);
    } else {
      console.log('📧 Would send email:', options);
    }
  } catch (error) {
    console.error('❌ Email error:', error);
  }
}

// Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'Development server running', orders: orders.length });
});

// Admin login
app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const admin = adminUsers.find(u => u.username === username);
    
    if (!admin || !bcrypt.compareSync(password, admin.password)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    admin.last_login = new Date().toISOString();
    const token = jwt.sign({ id: admin.id, username: admin.username }, JWT_SECRET, { expiresIn: '24h' });
    
    res.json({ token, user: { id: admin.id, username: admin.username, email: admin.email } });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get orders (with pagination and filtering)
app.get('/api/orders', authMiddleware, (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const status = req.query.status;
    
    let filteredOrders = orders;
    if (status) {
      filteredOrders = orders.filter(order => order.status === status);
    }
    
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedOrders = filteredOrders.slice(startIndex, endIndex);
    
    res.json({
      orders: paginatedOrders,
      pagination: {
        page,
        limit,
        total: filteredOrders.length,
        pages: Math.ceil(filteredOrders.length / limit)
      }
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Create order
app.post('/api/orders', async (req, res) => {
  try {
    const { 
      customer_name, customer_email, customer_phone,
      billing_address, shipping_address, 
      items, total_amount, payment_intent_id 
    } = req.body;

    const order = {
      id: Date.now().toString(),
      customer_name,
      customer_email,
      customer_phone,
      billing_address,
      shipping_address,
      items,
      total_amount,
      payment_intent_id,
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      tracking_number: null,
      notes: null
    };

    orders.push(order);

    // Send confirmation email
    await sendEmail({
      to: customer_email,
      subject: 'Order Confirmation - Edwards Technology Services',
      html: `
        <h2>Thank you for your order!</h2>
        <p>Dear ${customer_name},</p>
        <p>Your order #${order.id} has been received and is being processed.</p>
        <h3>Order Details:</h3>
        <ul>
          ${items.map(item => `<li>${item.name} - $${item.price}</li>`).join('')}
        </ul>
        <p><strong>Total: $${total_amount}</strong></p>
        <p>You will receive another email once your order ships.</p>
        <p>Best regards,<br>Edwards Technology Services</p>
      `
    });

    res.status(201).json(order);
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// Update order
app.put('/api/orders/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, tracking_number, notes } = req.body;
    
    const orderIndex = orders.findIndex(order => order.id === id);
    if (orderIndex === -1) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    const order = orders[orderIndex];
    const oldStatus = order.status;
    
    // Update order
    orders[orderIndex] = {
      ...order,
      status: status || order.status,
      tracking_number: tracking_number !== undefined ? tracking_number : order.tracking_number,
      notes: notes !== undefined ? notes : order.notes,
      updated_at: new Date().toISOString()
    };
    
    // Send email if status changed to shipped
    if (status === 'shipped' && oldStatus !== 'shipped' && tracking_number) {
      await sendEmail({
        to: order.customer_email,
        subject: 'Your Order Has Shipped - Edwards Technology Services',
        html: `
          <h2>Your order is on its way!</h2>
          <p>Dear ${order.customer_name},</p>
          <p>Your order #${order.id} has shipped!</p>
          <p><strong>Tracking Number:</strong> ${tracking_number}</p>
          <p>You can track your package using the tracking number above.</p>
          <p>Best regards,<br>Edwards Technology Services</p>
        `
      });
    }
    
    res.json(orders[orderIndex]);
  } catch (error) {
    console.error('Update order error:', error);
    res.status(500).json({ error: 'Failed to update order' });
  }
});

// Stripe payment intent
app.post('/api/create-payment-intent', async (req, res) => {
  try {
    const { amount, currency = 'usd', customer_email } = req.body;
    
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency,
      metadata: { customer_email }
    });
    
    res.json({ 
      client_secret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id
    });
  } catch (error) {
    console.error('Payment intent error:', error);
    res.status(500).json({ error: 'Failed to create payment intent' });
  }
});

// Generate PDF receipt for an order
app.get('/api/orders/:id/receipt', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const order = orders.find(o => o.id === id);
    
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
    const order = orders.find(o => o.id === id);
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    const pdfGenerator = new PDFReceiptGenerator();
    const pdfBuffer = await pdfGenerator.generateReceipt(order);
    
    await sendEmail({
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
    
    const order = orders.find(o => 
      o.id === orderId && 
      o.customer_email.toLowerCase() === email.toLowerCase()
    );
    
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
    
    const order = orders.find(o => 
      o.id === id && 
      o.customer_email.toLowerCase() === email.toLowerCase()
    );
    
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

// Analytics endpoint
app.get('/api/admin/analytics', authMiddleware, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const cutoffDate = new Date(Date.now() - (days * 24 * 60 * 60 * 1000));
    
    // Filter orders within the time range
    const filteredOrders = orders.filter(order => 
      new Date(order.created_at) >= cutoffDate
    );
    
    // Calculate total revenue
    const totalRevenue = filteredOrders.reduce((sum, order) => 
      sum + parseFloat(order.total_amount), 0
    );
    
    // Count orders by status
    const statusBreakdown = filteredOrders.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    }, {});
    
    // Count unique customers
    const uniqueCustomers = new Set(filteredOrders.map(order => order.customer_email)).size;
    
    // Count pending orders
    const pendingOrders = filteredOrders.filter(order => 
      ['pending', 'processing'].includes(order.status)
    ).length;
    
    // Get recent orders (last 5)
    const recentOrders = [...filteredOrders]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 5);
    
    // Calculate top services
    const serviceCount = {};
    filteredOrders.forEach(order => {
      if (order.items) {
        order.items.forEach(item => {
          serviceCount[item.name] = (serviceCount[item.name] || 0) + 1;
        });
      }
    });
    
    const topServices = Object.entries(serviceCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([label, value]) => ({ label, value }));
    
    // Calculate monthly revenue for trend
    const monthlyRevenue = [];
    for (let i = Math.min(days / 30, 12) - 1; i >= 0; i--) {
      const monthStart = new Date();
      monthStart.setMonth(monthStart.getMonth() - i);
      monthStart.setDate(1);
      const monthEnd = new Date(monthStart);
      monthEnd.setMonth(monthEnd.getMonth() + 1);
      
      const monthOrders = orders.filter(order => {
        const orderDate = new Date(order.created_at);
        return orderDate >= monthStart && orderDate < monthEnd;
      });
      
      const monthRevenue = monthOrders.reduce((sum, order) => 
        sum + parseFloat(order.total_amount), 0
      );
      
      monthlyRevenue.push({
        label: monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        value: Math.round(monthRevenue)
      });
    }
    
    res.json({
      totalOrders: filteredOrders.length,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      pendingOrders,
      uniqueCustomers,
      recentOrders,
      statusBreakdown,
      monthlyRevenue,
      topServices
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// Customers endpoint
app.get('/api/admin/customers', authMiddleware, async (req, res) => {
  try {
    // Group orders by customer email to build customer profiles
    const customerMap = new Map();
    
    orders.forEach(order => {
      const email = order.customer_email;
      
      if (!customerMap.has(email)) {
        // Extract address info from first order
        let city = '', state = '';
        try {
          const billingAddress = JSON.parse(order.billing_address);
          city = billingAddress.city || '';
          state = billingAddress.state || '';
        } catch (e) {
          // If parsing fails, leave empty
        }
        
        customerMap.set(email, {
          name: order.customer_name,
          email: email,
          phone: order.customer_phone,
          city: city,
          state: state,
          order_count: 0,
          total_spent: 0,
          last_order_date: order.created_at,
          orders: []
        });
      }
      
      const customer = customerMap.get(email);
      customer.order_count += 1;
      customer.total_spent += parseFloat(order.total_amount);
      
      // Update last order date if this order is more recent
      if (new Date(order.created_at) > new Date(customer.last_order_date)) {
        customer.last_order_date = order.created_at;
      }
      
      // Add order to customer's order history
      customer.orders.push({
        id: order.id,
        created_at: order.created_at,
        total_amount: order.total_amount,
        status: order.status,
        items: order.items
      });
    });
    
    // Convert map to array and round total_spent
    const customers = Array.from(customerMap.values()).map(customer => ({
      ...customer,
      total_spent: Math.round(customer.total_spent * 100) / 100,
      orders: customer.orders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    }));
    
    res.json(customers);
  } catch (error) {
    console.error('Customers error:', error);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

// Contact form (legacy endpoint)
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;
    
    await sendEmail({
      to: process.env.EMAIL_USER || 'test@example.com',
      subject: `Contact Form: ${subject}`,
      html: `
        <h3>New Contact Form Submission</h3>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <p><strong>Message:</strong></p>
        <p>${message}</p>
      `
    });
    
    res.json({ message: 'Message sent successfully' });
  } catch (error) {
    console.error('Contact form error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Development server running on port ${PORT}`);
  console.log(`📊 Admin credentials: ${ADMIN_USER} / ${ADMIN_PASS}`);
  console.log('🔧 Using in-memory database for development');
});