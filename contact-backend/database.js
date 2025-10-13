const { Pool } = require('pg');

// Database configuration
const pool = new Pool({
  host: process.env.DB_HOST || 'postgres-service',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'ecommerce',
  user: process.env.DB_USER || 'ecommerce_user',
  password: process.env.DB_PASSWORD || 'postgres123',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Initialize database tables
async function initializeDatabase() {
  try {
    // Orders table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        customer_name VARCHAR(255) NOT NULL,
        customer_email VARCHAR(255) NOT NULL,
        customer_phone VARCHAR(20),
        customer_address TEXT,
        shipping_address TEXT,
        billing_address TEXT,
        items JSONB NOT NULL,
        subtotal DECIMAL(10,2) NOT NULL,
        tax DECIMAL(10,2) DEFAULT 0,
        total DECIMAL(10,2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'USD',
        status VARCHAR(50) DEFAULT 'pending',
        payment_intent_id VARCHAR(255),
        payment_status VARCHAR(50) DEFAULT 'pending',
        tracking_number VARCHAR(255),
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add new columns to existing tables if they don't exist
    try {
      await pool.query(`
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(20);
      `);
      await pool.query(`
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_address TEXT;
      `);
      await pool.query(`
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS billing_address TEXT;
      `);
      await pool.query(`
        ALTER TABLE customers ADD COLUMN IF NOT EXISTS shipping_address TEXT;
      `);
      await pool.query(`
        ALTER TABLE customers ADD COLUMN IF NOT EXISTS billing_address TEXT;
      `);
    } catch (error) {
      console.log('Migration columns may already exist:', error.message);
    }

    // Admin users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        last_login TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Customers table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(50),
        address TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Products table (for your projects)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS products (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price DECIMAL(10,2) NOT NULL,
        category VARCHAR(100),
        images JSONB,
        options JSONB,
        in_stock BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Update trigger for updated_at
    await pool.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    await pool.query(`
      DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
      CREATE TRIGGER update_orders_updated_at 
        BEFORE UPDATE ON orders 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);

    await pool.query(`
      DROP TRIGGER IF EXISTS update_customers_updated_at ON customers;
      CREATE TRIGGER update_customers_updated_at 
        BEFORE UPDATE ON customers 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);

    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    throw error;
  }
}

// Database operations
const db = {
  // Test connection
  async testConnection() {
    try {
      const result = await pool.query('SELECT NOW()');
      console.log('✅ Database connection successful:', result.rows[0]);
      return true;
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      return false;
    }
  },

  // Orders
  async createOrder(orderData) {
    const { 
      customerName, 
      customerEmail, 
      customerPhone,
      customerAddress, 
      shippingAddress,
      billingAddress,
      items, 
      subtotal, 
      tax, 
      total 
    } = orderData;
    
    const query = `
      INSERT INTO orders (
        customer_name, 
        customer_email, 
        customer_phone,
        customer_address, 
        shipping_address,
        billing_address,
        items, 
        subtotal, 
        tax, 
        total
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;
    
    const values = [
      customerName, 
      customerEmail, 
      customerPhone || null,
      customerAddress || shippingAddress, // Legacy support
      shippingAddress || customerAddress,
      billingAddress || shippingAddress || customerAddress,
      JSON.stringify(items), 
      subtotal, 
      tax, 
      total
    ];
    const result = await pool.query(query, values);
    return result.rows[0];
  },

  async getOrders(limit = 50, offset = 0) {
    const query = `
      SELECT * FROM orders 
      ORDER BY created_at DESC 
      LIMIT $1 OFFSET $2
    `;
    const result = await pool.query(query, [limit, offset]);
    return result.rows;
  },

  async getOrder(id) {
    const query = 'SELECT * FROM orders WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  },

  async getOrderByIdAndEmail(id, email) {
    const query = 'SELECT * FROM orders WHERE id = $1 AND customer_email = $2';
    const result = await pool.query(query, [id, email.toLowerCase()]);
    return result.rows[0];
  },

  async updateOrderStatus(id, status, trackingNumber = null) {
    const query = `
      UPDATE orders 
      SET status = $2, tracking_number = $3, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 
      RETURNING *
    `;
    const result = await pool.query(query, [id, status, trackingNumber]);
    return result.rows[0];
  },

  async updatePaymentStatus(id, paymentStatus, paymentIntentId = null) {
    const query = `
      UPDATE orders 
      SET payment_status = $2, payment_intent_id = $3, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 
      RETURNING *
    `;
    const result = await pool.query(query, [id, paymentStatus, paymentIntentId]);
    return result.rows[0];
  },

  // Customers
  async createOrUpdateCustomer(customerData) {
    const { name, email, phone, address, shippingAddress, billingAddress } = customerData;
    
    const query = `
      INSERT INTO customers (name, email, phone, address, shipping_address, billing_address)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (email) 
      DO UPDATE SET 
        name = EXCLUDED.name,
        phone = EXCLUDED.phone,
        address = EXCLUDED.address,
        shipping_address = EXCLUDED.shipping_address,
        billing_address = EXCLUDED.billing_address,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;
    
    const values = [
      name, 
      email, 
      phone, 
      address || shippingAddress, // Legacy support
      shippingAddress || address,
      billingAddress || shippingAddress || address
    ];
    const result = await pool.query(query, values);
    return result.rows[0];
  },

  // Products
  async getProducts() {
    const query = 'SELECT * FROM products WHERE in_stock = true ORDER BY name';
    const result = await pool.query(query);
    return result.rows;
  },

  async getProduct(id) {
    const query = 'SELECT * FROM products WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  },

  // Admin Users
  async getAdminUser(username) {
    const query = 'SELECT * FROM admin_users WHERE username = $1';
    const result = await pool.query(query, [username]);
    return result.rows[0];
  },

  async createAdminUser(username, passwordHash, email = null) {
    const query = `
      INSERT INTO admin_users (username, password_hash, email)
      VALUES ($1, $2, $3)
      RETURNING id, username, email, created_at
    `;
    const result = await pool.query(query, [username, passwordHash, email]);
    return result.rows[0];
  },

  async updateAdminLastLogin(username) {
    const query = 'UPDATE admin_users SET last_login = CURRENT_TIMESTAMP WHERE username = $1';
    await pool.query(query, [username]);
  },

  // Payment Management
  async updateOrderPaymentStatus(orderId, paymentStatus, paymentIntentId = null) {
    const query = `
      UPDATE orders 
      SET payment_status = $1, payment_intent_id = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `;
    const result = await pool.query(query, [paymentStatus, paymentIntentId, orderId]);
    return result.rows[0];
  },

  // Close connection
  async close() {
    await pool.end();
  }
};

module.exports = { db, initializeDatabase };