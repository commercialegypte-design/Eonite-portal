-- ============================================================================
-- ORDER ITEMS TABLE FOR MULTI-PRODUCT ORDERS
-- ============================================================================

-- Order items table stores individual products within an order
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  client_product_id UUID REFERENCES client_products(id),
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for efficient order item lookups
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_client_product ON order_items(client_product_id);

-- Enable Row Level Security
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- ORDER ITEMS RLS POLICIES
-- ============================================================================

-- Clients can view order items for their own orders
CREATE POLICY "Clients can view own order items"
  ON order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.client_id = auth.uid()
    )
  );

-- Admins can view all order items
CREATE POLICY "Admins can view all order items"
  ON order_items FOR SELECT
  USING (is_admin());

-- Clients can insert order items for their own orders
CREATE POLICY "Clients can insert own order items"
  ON order_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.client_id = auth.uid()
    )
  );

-- Admins can manage all order items
CREATE POLICY "Admins can manage order items"
  ON order_items FOR ALL
  USING (is_admin());
