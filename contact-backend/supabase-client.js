const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL || 'http://localhost:8000';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || 'placeholder-key';

// Validate required environment variables
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  console.warn('⚠️ Supabase configuration missing. Set SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables.');
}

// Create Supabase client with service role key to bypass RLS
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Initialize database - no-op for Supabase as tables are created via migrations
async function initializeDatabase() {
  try {
    console.log('🔌 Supabase client initialized');
    console.log('📋 Note: Run migrations/001_initial_schema.sql in Supabase Studio to create tables');
    return true;
  } catch (error) {
    console.error('❌ Supabase initialization error:', error);
    throw error;
  }
}

// Database operations - compatible with existing database.js interface
const db = {
  // Test connection
  async testConnection() {
    try {
      // Simple query to test connection
      const { data, error } = await supabase.from('orders').select('id').limit(1);
      
      if (error && error.code !== 'PGRST116') {
        // PGRST116 is "no rows returned" which is fine for an empty table
        // But also handle case where table doesn't exist yet
        if (error.code === '42P01' || error.message.includes('does not exist')) {
          console.log('⚠️ Tables may not exist yet. Run migrations first.');
          return true; // Still consider connection successful
        }
        throw error;
      }
      
      console.log('✅ Supabase connection successful');
      return true;
    } catch (error) {
      console.error('❌ Supabase connection failed:', error);
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
    
    const { data, error } = await supabase
      .from('orders')
      .insert({
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone || null,
        customer_address: customerAddress || shippingAddress,
        shipping_address: shippingAddress || customerAddress,
        billing_address: billingAddress || shippingAddress || customerAddress,
        items: items,
        subtotal: subtotal,
        tax: tax,
        total: total
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async getOrders(limit = 50, offset = 0) {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (error) throw error;
    return data || [];
  },

  async getOrder(id) {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async getOrderByIdAndEmail(id, email) {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .eq('customer_email', email.toLowerCase())
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async updateOrderStatus(id, status, trackingNumber = null) {
    const { data, error } = await supabase
      .from('orders')
      .update({
        status: status,
        tracking_number: trackingNumber,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async updatePaymentStatus(id, paymentStatus, paymentIntentId = null) {
    const { data, error } = await supabase
      .from('orders')
      .update({
        payment_status: paymentStatus,
        payment_intent_id: paymentIntentId,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Customers
  async createOrUpdateCustomer(customerData) {
    const { name, email, phone, address, shippingAddress, billingAddress } = customerData;
    
    const { data, error } = await supabase
      .from('customers')
      .upsert({
        name: name,
        email: email,
        phone: phone,
        address: address || shippingAddress,
        shipping_address: shippingAddress || address,
        billing_address: billingAddress || shippingAddress || address,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'email'
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Products
  async getProducts() {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('in_stock', true)
      .order('name');
    
    if (error) throw error;
    return data || [];
  },

  async getProduct(id) {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  // Admin Users
  async getAdminUser(username) {
    const { data, error } = await supabase
      .from('admin_users')
      .select('*')
      .eq('username', username)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async createAdminUser(username, passwordHash, email = null) {
    const { data, error } = await supabase
      .from('admin_users')
      .insert({
        username: username,
        password_hash: passwordHash,
        email: email
      })
      .select('id, username, email, created_at')
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateAdminLastLogin(username) {
    const { error } = await supabase
      .from('admin_users')
      .update({ last_login: new Date().toISOString() })
      .eq('username', username);
    
    if (error) throw error;
  },

  // Payment Management
  async updateOrderPaymentStatus(orderId, paymentStatus, paymentIntentId = null) {
    const { data, error } = await supabase
      .from('orders')
      .update({
        payment_status: paymentStatus,
        payment_intent_id: paymentIntentId,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Close connection - no-op for Supabase
  async close() {
    console.log('🔌 Supabase connection closed (no-op)');
  }
};

module.exports = { db, supabase, initializeDatabase };
