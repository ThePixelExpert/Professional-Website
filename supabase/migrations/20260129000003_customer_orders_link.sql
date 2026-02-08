-- Customer Orders Link Migration
-- Adds user_id to orders for authenticated customer order tracking
-- Created: 2026-01-29

-- Add user_id column to orders table
-- NULL allowed for guest checkout orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Index for faster user order lookups
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);

-- RLS Policy: Customers can read their own orders
-- This supplements the existing service_role policy
CREATE POLICY "Customers can view own orders" ON orders
  FOR SELECT
  USING (auth.uid() = user_id);

-- Optional: Allow customers to update specific fields on their orders
-- (e.g., adding notes or changing shipping address before fulfillment)
-- Commented out for now - implement if needed
-- CREATE POLICY "Customers can update own pending orders" ON orders
--   FOR UPDATE
--   USING (auth.uid() = user_id AND status = 'pending')
--   WITH CHECK (auth.uid() = user_id AND status = 'pending');

COMMENT ON COLUMN orders.user_id IS 'Links order to authenticated user. NULL for guest checkout.';
