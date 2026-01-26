-- Product categories table for dynamic category management
CREATE TABLE IF NOT EXISTS product_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  display_name_fr TEXT,
  display_name_en TEXT,
  icon TEXT DEFAULT 'fa-tag',
  color TEXT DEFAULT '#6B705C',
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_product_categories_name ON product_categories(name);

-- RLS policies for product_categories
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read product categories" ON product_categories
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage product categories" ON product_categories
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'designer')
    )
  );

-- Insert default categories from the existing enum values
INSERT INTO product_categories (name, display_name_fr, display_name_en, icon, display_order)
VALUES 
  ('standard', 'Standard', 'Standard', 'fa-box', 1),
  ('window', 'Fenêtre', 'Window', 'fa-window-maximize', 2),
  ('special', 'Spécial', 'Special', 'fa-star', 3),
  ('seasonal', 'Saisonnier', 'Seasonal', 'fa-snowflake', 4)
ON CONFLICT (name) DO NOTHING;

-- Remove the CHECK constraint on products.category to allow dynamic categories
-- This is done by recreating the column without the constraint
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_category_check;
