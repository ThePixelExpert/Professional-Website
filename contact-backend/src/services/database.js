// Database service using Supabase
// Implements the same interface as the original database.js but uses Supabase query builder
const { supabaseAdmin, hasAdminClient } = require('../config/supabase')

// Database operations
const db = {
  // Test connection
  async testConnection() {
    try {
      const { data, error } = await supabaseAdmin
        .from('orders')
        .select('count')
        .limit(1)

      if (error) {
        console.error('Database connection test failed:', error)
        throw error
      }

      console.log('Database connection successful')
      return true
    } catch (error) {
      console.error('Database connection failed:', error)
      return false
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
      total,
      userId  // NEW: optional user ID for authenticated customers
    } = orderData

    const { data, error } = await supabaseAdmin
      .from('orders')
      .insert({
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone || null,
        customer_address: customerAddress || shippingAddress, // Legacy support
        shipping_address: shippingAddress || customerAddress,
        billing_address: billingAddress || shippingAddress || customerAddress,
        items: items,
        subtotal: subtotal,
        tax: tax,
        total: total,
        user_id: userId || null  // NEW: link to user if authenticated, NULL for guests
      })
      .select()
      .single()

    if (error) {
      console.error('Database error creating order:', error)
      throw error
    }

    return data
  },

  async getOrders(limit = 50, offset = 0) {
    const { data, error } = await supabaseAdmin
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Database error fetching orders:', error)
      throw error
    }

    return data
  },

  async getOrder(id) {
    const { data, error } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Database error fetching order:', error)
      throw error
    }

    return data
  },

  async getOrderByIdAndEmail(id, email) {
    const { data, error } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', id)
      .eq('customer_email', email.toLowerCase())
      .single()

    if (error) {
      console.error('Database error fetching order by ID and email:', error)
      throw error
    }

    return data
  },

  async updateOrderStatus(id, status, trackingNumber = null) {
    const updateData = {
      status: status,
      tracking_number: trackingNumber
    }
    // Note: Do NOT manually set updated_at - the moddatetime trigger handles it

    const { data, error } = await supabaseAdmin
      .from('orders')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Database error updating order status:', error)
      throw error
    }

    return data
  },

  /**
   * Update payment status for an order
   * @param {string} id - Order ID (FIRST parameter)
   * @param {string} paymentStatus - Payment status
   * @param {string} paymentIntentId - Stripe payment intent ID
   */
  async updatePaymentStatus(id, paymentStatus, paymentIntentId = null) {
    const { data, error } = await supabaseAdmin
      .from('orders')
      .update({
        payment_status: paymentStatus,
        payment_intent_id: paymentIntentId
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Database error updating payment status:', error)
      throw error
    }

    return data
  },

  /**
   * Update order payment status (alternative method used by webhook handler)
   *
   * HISTORICAL NOTE: In the original database.js with raw SQL, the parameter binding order was DIFFERENT:
   * - updatePaymentStatus bound: [id, paymentStatus, paymentIntentId] (id as $1)
   * - updateOrderPaymentStatus bound: [paymentStatus, paymentIntentId, orderId] (orderId as $3)
   *
   * However, since Supabase uses named parameters via the query builder, both methods can use
   * the SAME implementation pattern. The method signature (orderId, paymentStatus, paymentIntentId)
   * matches how callers invoke it.
   *
   * @param {string} orderId - Order ID to update
   * @param {string} paymentStatus - Payment status
   * @param {string} paymentIntentId - Stripe payment intent ID
   */
  async updateOrderPaymentStatus(orderId, paymentStatus, paymentIntentId = null) {
    const { data, error } = await supabaseAdmin
      .from('orders')
      .update({
        payment_status: paymentStatus,
        payment_intent_id: paymentIntentId
      })
      .eq('id', orderId)
      .select()
      .single()

    if (error) {
      console.error('Database error updating order payment status:', error)
      throw error
    }

    return data
  },

  // Customers
  /**
   * Create or update customer with address fallback logic
   * CRITICAL: Preserves the exact address fallback logic from original database.js
   */
  async createOrUpdateCustomer(customerData) {
    const { name, email, phone, address, shippingAddress, billingAddress } = customerData

    // Build data object with fallback logic matching original implementation
    const data = {
      name: name,
      email: email,
      phone: phone,
      address: address || shippingAddress,                      // Legacy support
      shipping_address: shippingAddress || address,             // Fallback to address
      billing_address: billingAddress || shippingAddress || address  // Cascade fallback
    }

    const { data: result, error } = await supabaseAdmin
      .from('customers')
      .upsert(data, { onConflict: 'email' })
      .select()
      .single()

    if (error) {
      console.error('Database error creating/updating customer:', error)
      throw error
    }

    return result
  },

  // Products
  async getProducts() {
    const { data, error } = await supabaseAdmin
      .from('products')
      .select('*')
      .eq('in_stock', true)
      .order('name')

    if (error) {
      console.error('Database error fetching products:', error)
      throw error
    }

    return data
  },

  async getProduct(id) {
    const { data, error } = await supabaseAdmin
      .from('products')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Database error fetching product:', error)
      throw error
    }

    return data
  },

  // Admin Users
  async getAdminUser(username) {
    const { data, error } = await supabaseAdmin
      .from('admin_users')
      .select('*')
      .eq('username', username)
      .maybeSingle()

    if (error) {
      console.error('Database error fetching admin user:', error)
      throw error
    }

    return data
  },

  async createAdminUser(username, passwordHash, email = null) {
    const { data, error } = await supabaseAdmin
      .from('admin_users')
      .insert({
        username: username,
        password_hash: passwordHash,
        email: email
      })
      .select('id, username, email, created_at')
      .single()

    if (error) {
      console.error('Database error creating admin user:', error)
      throw error
    }

    return data
  },

  async updateAdminLastLogin(username) {
    const { error } = await supabaseAdmin
      .from('admin_users')
      .update({ last_login: new Date().toISOString() })
      .eq('username', username)

    if (error) {
      console.error('Database error updating admin last login:', error)
      throw error
    }
  },

  // Close connection (no-op for Supabase - connection pooling handled automatically)
  async close() {
    console.log('Database connection closed (Supabase handles connection pooling)')
  }
}

// Initialize database (no-op for Supabase - schema managed via migrations)
async function initializeDatabase() {
  console.log('Database schema managed via Supabase migrations')
  console.log('No initialization needed - migrations handle schema creation')
}

module.exports = { db, initializeDatabase }
