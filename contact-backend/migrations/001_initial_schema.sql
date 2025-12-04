-- =============================================
-- Supabase Database Schema Migration
-- Edwards Engineering E-Commerce Database
-- =============================================

-- Enable UUID extension (usually already enabled in Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- ORDERS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
);

-- Index for common queries
CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

-- =============================================
-- ADMIN USERS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS admin_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for username lookups
CREATE INDEX IF NOT EXISTS idx_admin_users_username ON admin_users(username);

-- =============================================
-- CUSTOMERS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    address TEXT,
    shipping_address TEXT,
    billing_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for email lookups
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);

-- =============================================
-- PRODUCTS TABLE
-- =============================================
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
);

-- Index for product queries
CREATE INDEX IF NOT EXISTS idx_products_in_stock ON products(in_stock);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);

-- =============================================
-- UPDATED_AT TRIGGER FUNCTION
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- TRIGGERS FOR AUTO-UPDATING updated_at
-- =============================================

-- Orders trigger
DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Customers trigger
DROP TRIGGER IF EXISTS update_customers_updated_at ON customers;
CREATE TRIGGER update_customers_updated_at
    BEFORE UPDATE ON customers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Admin users trigger
DROP TRIGGER IF EXISTS update_admin_users_updated_at ON admin_users;
CREATE TRIGGER update_admin_users_updated_at
    BEFORE UPDATE ON admin_users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Products trigger
DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Enable RLS on all tables
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES - SERVICE ROLE FULL ACCESS
-- =============================================

-- Orders: Service role has full access
CREATE POLICY "Service role has full access to orders"
    ON orders
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Admin users: Service role has full access
CREATE POLICY "Service role has full access to admin_users"
    ON admin_users
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Customers: Service role has full access
CREATE POLICY "Service role has full access to customers"
    ON customers
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Products: Service role has full access
CREATE POLICY "Service role has full access to products"
    ON products
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- =============================================
-- RLS POLICIES - PUBLIC READ ACCESS FOR PRODUCTS
-- =============================================

-- Products: Public can read in-stock products
CREATE POLICY "Public can view in-stock products"
    ON products
    FOR SELECT
    TO anon, authenticated
    USING (in_stock = true);

-- =============================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================

COMMENT ON TABLE orders IS 'Customer orders with payment and shipping information';
COMMENT ON TABLE admin_users IS 'Admin user accounts for dashboard access';
COMMENT ON TABLE customers IS 'Customer information for order management';
COMMENT ON TABLE products IS 'Product catalog for e-commerce';

COMMENT ON COLUMN orders.items IS 'JSONB array of order items with product details';
COMMENT ON COLUMN orders.status IS 'Order status: pending, processing, shipped, delivered, cancelled';
COMMENT ON COLUMN orders.payment_status IS 'Payment status: pending, completed, failed, refunded';
COMMENT ON COLUMN products.images IS 'JSONB array of image URLs';
COMMENT ON COLUMN products.options IS 'JSONB object for product variants/options';
