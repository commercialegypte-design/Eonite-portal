-- Product variants table (multiple sizes/prices per product)
CREATE TABLE IF NOT EXISTS product_variants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  size TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  min_order_quantity INTEGER DEFAULT 5000,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Product images table (multiple images per product)
CREATE TABLE IF NOT EXISTS product_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images(product_id);

-- RLS policies for product_variants
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read product variants" ON product_variants
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage product variants" ON product_variants
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'designer')
    )
  );

-- RLS policies for product_images
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read product images" ON product_images
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage product images" ON product_images
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'designer')
    )
  );

-- Migrate existing products to have a default variant
INSERT INTO product_variants (product_id, size, price, min_order_quantity, is_default)
SELECT id, size, base_price, min_order_quantity, true
FROM products
WHERE NOT EXISTS (
  SELECT 1 FROM product_variants WHERE product_variants.product_id = products.id
);

-- Migrate existing product images to product_images table
INSERT INTO product_images (product_id, image_url, is_primary, display_order)
SELECT id, image_url, true, 0
FROM products
WHERE image_url IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM product_images WHERE product_images.product_id = products.id
);
