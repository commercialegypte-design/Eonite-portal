-- Add image_url column to products table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'image_url'
  ) THEN
    ALTER TABLE products ADD COLUMN image_url TEXT;
  END IF;
END $$;

-- Create storage bucket for product images (run this in Supabase Dashboard or via API)
-- Note: Storage buckets need to be created via the Supabase Dashboard or API
-- Go to Storage > Create new bucket > Name: product-images > Public: true

-- Storage policies will need to be set up in the Supabase Dashboard:
-- 1. Allow authenticated users to upload: INSERT with authenticated role
-- 2. Allow public read access: SELECT with anon role
