-- Seed data for testing
-- Note: Run this AFTER creating your first admin user through Supabase Auth

-- Insert sample products
INSERT INTO products (name, size, width, height, depth, base_price, paper_weight, category, is_active, min_order_quantity) VALUES
('Sac kraft 26x32 cm', '26x32', 26, 32, 12, 0.10, '90g', 'standard', true, 5000),
('Sac kraft 32x40 cm', '32x40', 32, 40, 15, 0.12, '90g', 'standard', true, 5000),
('Sac kraft 18x24 cm', '18x24', 18, 24, 8, 0.08, '90g', 'standard', true, 5000),
('Sac kraft 35x44 cm', '35x44', 35, 44, 18, 0.15, '110g', 'standard', true, 5000),
('Sac avec fenêtre 30x35 cm', '30x35', 30, 35, 12, 0.14, '90g', 'window', true, 5000),
('Sac avec fenêtre 25x38 cm', '25x38', 25, 38, 10, 0.13, '90g', 'window', true, 5000),
('Format baguette 15x60 cm', '15x60', 15, 60, 6, 0.09, '90g', 'special', true, 5000),
('Édition Noël', '26x32', 26, 32, 12, 0.11, '90g', 'seasonal', true, 3000),
('Édition Saint-Valentin', '26x32', 26, 32, 12, 0.09, '90g', 'seasonal', true, 3000),
('Halloween', '26x32', 26, 32, 12, 0.11, '90g', 'seasonal', false, 3000);

-- Insert active promotions
INSERT INTO promotions (title, description, discount_percent, applies_to_all, valid_until, is_active) VALUES
('PROMO Saint-Valentin', 'Économisez 15% sur tous les sacs édition Saint-Valentin', 15.00, false, '2025-01-31', true);

-- Update promotion for Valentine product
UPDATE promotions SET product_id = (SELECT id FROM products WHERE name = 'Édition Saint-Valentin' LIMIT 1)
WHERE title = 'PROMO Saint-Valentin';

-- Insert sample addresses for testing client (you'll need to update client_id after creating test users)
-- INSERT INTO addresses (client_id, label, address, city, postal_code, is_default) VALUES
-- ('YOUR_CLIENT_UUID', 'Boutique Paris 15e', '12 Rue de Paris', 'Paris', '75015', true),
-- ('YOUR_CLIENT_UUID', 'Boutique Lyon', '45 Avenue Jean Jaurès', 'Lyon', '69007', false);

-- Note: To create a test admin user:
-- 1. Go to Supabase Dashboard → Authentication → Users
-- 2. Create a new user
-- 3. Note the UUID
-- 4. Update the profiles table:
-- UPDATE profiles SET role = 'admin', company_name = 'EONITE SARL', contact_name = 'Walid' WHERE id = 'YOUR_ADMIN_UUID';
