-- Add client_stock column to client_products table
-- This tracks how many bags the client has at their location (separate from EONITE warehouse inventory)

ALTER TABLE client_products ADD COLUMN IF NOT EXISTS client_stock INTEGER DEFAULT 0;
ALTER TABLE client_products ADD COLUMN IF NOT EXISTS client_stock_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Allow clients to update their own client_stock
CREATE POLICY "Clients can update own client_stock" ON client_products
  FOR UPDATE
  USING (client_id = auth.uid())
  WITH CHECK (client_id = auth.uid());
