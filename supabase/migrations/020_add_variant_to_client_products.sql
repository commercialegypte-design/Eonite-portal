-- Add product_variant_id to client_products table
ALTER TABLE client_products 
ADD COLUMN IF NOT EXISTS product_variant_id UUID REFERENCES product_variants(id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_client_products_product_variant_id ON client_products(product_variant_id);

-- Backfill existing client_products if possible
-- We'll try to find a default variant for the product
UPDATE client_products cp
SET product_variant_id = (
  SELECT id FROM product_variants pv 
  WHERE pv.product_id = cp.product_id 
  AND pv.is_default = true
  LIMIT 1
)
WHERE product_variant_id IS NULL;

-- If no default variant found, try any variant
UPDATE client_products cp
SET product_variant_id = (
  SELECT id FROM product_variants pv 
  WHERE pv.product_id = cp.product_id 
  LIMIT 1
)
WHERE product_variant_id IS NULL;
