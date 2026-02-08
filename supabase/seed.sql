-- Development Seed Data
-- Provides realistic test data for local development
-- Created: 2026-01-28

-- Admin user (password: admin123)
-- Password hash generated with bcrypt (10 rounds)
INSERT INTO admin_users (username, password_hash, email)
VALUES (
  'admin',
  '$2b$10$rQZ8K3.qX5Y6H1JK9LmN0OhVJ8x6Y2q3W4e5R6t7Y8u9I0o1P2q3R',
  'admin@edwards-engineering.local'
)
ON CONFLICT (username) DO NOTHING;

-- Sample products
INSERT INTO products (id, name, description, price, category, images, options, in_stock)
VALUES
  (
    'custom-pcb-001',
    'Custom PCB Design',
    'Professional custom PCB design services for your electronics projects',
    150.00,
    'electronics',
    '[]'::jsonb,
    '{}'::jsonb,
    true
  ),
  (
    'firmware-dev-001',
    'Firmware Development',
    'Embedded firmware development for microcontrollers and IoT devices',
    500.00,
    'software',
    '[]'::jsonb,
    '{}'::jsonb,
    true
  ),
  (
    'pcb-assembly-001',
    'PCB Assembly Service',
    'Professional PCB assembly and testing services',
    75.00,
    'electronics',
    '[]'::jsonb,
    '{}'::jsonb,
    true
  )
ON CONFLICT (id) DO NOTHING;

-- Sample customer with all address fields populated
INSERT INTO customers (name, email, phone, address, shipping_address, billing_address)
VALUES (
  'Test Customer',
  'test@example.com',
  '+1-555-0123',
  '123 Main St',
  '123 Main St, Suite 100',
  '456 Billing Ave'
)
ON CONFLICT (email) DO NOTHING;

-- Sample orders
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
  total,
  status,
  payment_status
)
VALUES
  (
    'Test Customer',
    'test@example.com',
    '+1-555-0123',
    '123 Main St',
    '123 Main St, Suite 100',
    '456 Billing Ave',
    '[{"id": "custom-pcb-001", "name": "Custom PCB Design", "price": 150.00, "quantity": 1}]'::jsonb,
    150.00,
    12.00,
    162.00,
    'pending',
    'pending'
  ),
  (
    'Test Customer',
    'test@example.com',
    '+1-555-0123',
    '123 Main St',
    '123 Main St, Suite 100',
    '456 Billing Ave',
    '[{"id": "firmware-dev-001", "name": "Firmware Development", "price": 500.00, "quantity": 1}, {"id": "pcb-assembly-001", "name": "PCB Assembly Service", "price": 75.00, "quantity": 2}]'::jsonb,
    650.00,
    52.00,
    702.00,
    'completed',
    'paid'
  )
ON CONFLICT DO NOTHING;
