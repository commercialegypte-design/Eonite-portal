-- Migration: Allow clients to update their own inventory

-- Drop existing policy if it exists (to be safe, though likely it doesn't)
DROP POLICY IF EXISTS "Clients can update own inventory" ON inventory;

-- Create new policy
CREATE POLICY "Clients can update own inventory"
  ON inventory FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM client_products
      WHERE client_products.id = inventory.client_product_id
      AND client_products.client_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM client_products
      WHERE client_products.id = inventory.client_product_id
      AND client_products.client_id = auth.uid()
    )
  );
