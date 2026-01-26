-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  role TEXT CHECK (role IN ('client', 'admin', 'designer')) DEFAULT 'client',
  company_name TEXT,
  contact_name TEXT,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  siret TEXT,
  vat_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Delivery addresses
CREATE TABLE addresses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  country TEXT DEFAULT 'France',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Products catalog
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  size TEXT NOT NULL, -- "26x32", "32x40", etc.
  width INTEGER, -- cm
  height INTEGER, -- cm
  depth INTEGER, -- cm
  base_price DECIMAL(10,2) NOT NULL,
  paper_weight TEXT DEFAULT '90g',
  handle_type TEXT DEFAULT 'flat',
  category TEXT CHECK (category IN ('standard', 'window', 'special', 'seasonal')) DEFAULT 'standard',
  is_seasonal BOOLEAN DEFAULT false,
  season_name TEXT, -- "Valentine", "Christmas", etc.
  is_active BOOLEAN DEFAULT true,
  image_url TEXT,
  description TEXT,
  min_order_quantity INTEGER DEFAULT 5000,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Client customized products
CREATE TABLE client_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  custom_name TEXT, -- Client's custom name for the product
  custom_design_url TEXT, -- BAT file URL
  logo_url TEXT,
  print_color TEXT DEFAULT 'black',
  print_colors_count INTEGER DEFAULT 1,
  paper_weight TEXT DEFAULT '90g',
  handle_type TEXT DEFAULT 'flat',
  is_active BOOLEAN DEFAULT true,
  last_order_date DATE,
  total_ordered INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- EONITE centralized inventory
CREATE TABLE inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_product_id UUID REFERENCES client_products(id) ON DELETE CASCADE UNIQUE,
  quantity INTEGER DEFAULT 0,
  alert_threshold INTEGER DEFAULT 1500,
  critical_threshold INTEGER DEFAULT 500,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT
);

-- Orders
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number TEXT UNIQUE NOT NULL,
  client_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  client_product_id UUID REFERENCES client_products(id),
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  total_ht DECIMAL(10,2) NOT NULL,
  total_ttc DECIMAL(10,2) NOT NULL,
  tva_rate DECIMAL(5,2) DEFAULT 20.00,
  status TEXT CHECK (status IN ('quote', 'confirmed', 'production', 'delivered_eonite', 'available', 'cancelled')) DEFAULT 'quote',
  production_progress INTEGER DEFAULT 0 CHECK (production_progress >= 0 AND production_progress <= 100),
  estimated_completion DATE,
  actual_completion DATE,
  invoice_url TEXT,
  bat_url TEXT,
  payment_status TEXT CHECK (payment_status IN ('pending', 'paid', 'refunded')) DEFAULT 'pending',
  payment_method TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Order timeline (tracking)
CREATE TABLE order_timeline (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Deliveries
CREATE TABLE deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  client_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  address_id UUID REFERENCES addresses(id),
  delivery_date DATE NOT NULL,
  quantity INTEGER NOT NULL,
  status TEXT CHECK (status IN ('scheduled', 'in_transit', 'delivered', 'cancelled')) DEFAULT 'scheduled',
  tracking_number TEXT,
  tracking_url TEXT,
  delivery_proof_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Conversations
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  admin_id UUID REFERENCES profiles(id),
  subject TEXT DEFAULT 'General',
  status TEXT CHECK (status IN ('open', 'closed')) DEFAULT 'open',
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  unread_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Messages
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  attachment_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Saved quotes
CREATE TABLE saved_quotes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  options JSONB, -- {paper: "110g", handles: "twisted", colors: 2}
  notes TEXT,
  is_converted BOOLEAN DEFAULT false,
  order_id UUID REFERENCES orders(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Documents
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  client_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('invoice', 'delivery_note', 'bat', 'quote', 'terms', 'certificate')) NOT NULL,
  document_number TEXT,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Promotions
CREATE TABLE promotions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  discount_percent DECIMAL(5,2),
  discount_fixed DECIMAL(10,2),
  product_id UUID REFERENCES products(id),
  applies_to_all BOOLEAN DEFAULT false,
  valid_from DATE DEFAULT CURRENT_DATE,
  valid_until DATE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  promo_code TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT CHECK (type IN ('stock_alert', 'order_update', 'promotion', 'message', 'delivery', 'system')) NOT NULL,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  link TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User preferences
CREATE TABLE user_preferences (
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE PRIMARY KEY,
  email_notifications BOOLEAN DEFAULT true,
  sms_notifications BOOLEAN DEFAULT false,
  stock_alert_enabled BOOLEAN DEFAULT true,
  stock_alert_threshold INTEGER DEFAULT 1500,
  language TEXT DEFAULT 'fr',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_orders_client ON orders(client_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created ON orders(created_at DESC);
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_created ON messages(created_at DESC);
CREATE INDEX idx_inventory_client_product ON inventory(client_product_id);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX idx_deliveries_date ON deliveries(delivery_date);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_client_products_updated_at BEFORE UPDATE ON client_products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'client');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create profile
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to notify low stock
CREATE OR REPLACE FUNCTION notify_low_stock()
RETURNS TRIGGER AS $$
BEGIN
  -- Critical alert
  IF NEW.quantity <= NEW.critical_threshold THEN
    INSERT INTO notifications (user_id, title, message, type, metadata)
    SELECT 
      cp.client_id,
      '🚨 CRITICAL: Stock très faible',
      format('Stock critique: %s sacs restants pour %s', NEW.quantity, p.name),
      'stock_alert',
      jsonb_build_object('inventory_id', NEW.id, 'quantity', NEW.quantity, 'level', 'critical')
    FROM client_products cp
    JOIN products p ON cp.product_id = p.id
    WHERE cp.id = NEW.client_product_id;
  
  -- Warning alert
  ELSIF NEW.quantity <= NEW.alert_threshold THEN
    INSERT INTO notifications (user_id, title, message, type, metadata)
    SELECT 
      cp.client_id,
      '⚠️ Stock faible',
      format('Stock: %s sacs restants pour %s', NEW.quantity, p.name),
      'stock_alert',
      jsonb_build_object('inventory_id', NEW.id, 'quantity', NEW.quantity, 'level', 'warning')
    FROM client_products cp
    JOIN products p ON cp.product_id = p.id
    WHERE cp.id = NEW.client_product_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_inventory_levels
  AFTER UPDATE OF quantity ON inventory
  FOR EACH ROW
  WHEN (NEW.quantity IS DISTINCT FROM OLD.quantity)
  EXECUTE FUNCTION notify_low_stock();

-- Function to update conversation last_message_at
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_conversation_on_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_timestamp();

-- Function to generate order number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
DECLARE
  year TEXT;
  counter INTEGER;
BEGIN
  year := TO_CHAR(CURRENT_DATE, 'YYYY');
  
  SELECT COUNT(*) + 1 INTO counter
  FROM orders
  WHERE order_number LIKE 'CMD-' || year || '-%';
  
  RETURN 'CMD-' || year || '-' || LPAD(counter::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;
