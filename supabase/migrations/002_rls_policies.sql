-- Enable Row Level Security on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role IN ('admin', 'designer')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PROFILES POLICIES
-- ============================================================================

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (is_admin());

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Admins can update any profile
CREATE POLICY "Admins can update any profile"
  ON profiles FOR UPDATE
  USING (is_admin());

-- ============================================================================
-- ADDRESSES POLICIES
-- ============================================================================

CREATE POLICY "Users can view own addresses"
  ON addresses FOR SELECT
  USING (auth.uid() = client_id);

CREATE POLICY "Admins can view all addresses"
  ON addresses FOR SELECT
  USING (is_admin());

CREATE POLICY "Users can insert own addresses"
  ON addresses FOR INSERT
  WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Users can update own addresses"
  ON addresses FOR UPDATE
  USING (auth.uid() = client_id);

CREATE POLICY "Users can delete own addresses"
  ON addresses FOR DELETE
  USING (auth.uid() = client_id);

-- ============================================================================
-- PRODUCTS POLICIES (public catalog)
-- ============================================================================

CREATE POLICY "Anyone can view active products"
  ON products FOR SELECT
  USING (is_active = true OR is_admin());

CREATE POLICY "Admins can insert products"
  ON products FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update products"
  ON products FOR UPDATE
  USING (is_admin());

CREATE POLICY "Admins can delete products"
  ON products FOR DELETE
  USING (is_admin());

-- ============================================================================
-- CLIENT_PRODUCTS POLICIES
-- ============================================================================

CREATE POLICY "Clients can view own products"
  ON client_products FOR SELECT
  USING (auth.uid() = client_id);

CREATE POLICY "Admins can view all client products"
  ON client_products FOR SELECT
  USING (is_admin());

CREATE POLICY "Clients can insert own products"
  ON client_products FOR INSERT
  WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Clients can update own products"
  ON client_products FOR UPDATE
  USING (auth.uid() = client_id);

CREATE POLICY "Admins can update any client products"
  ON client_products FOR UPDATE
  USING (is_admin());

-- ============================================================================
-- INVENTORY POLICIES
-- ============================================================================

CREATE POLICY "Clients can view own inventory"
  ON inventory FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM client_products
      WHERE client_products.id = inventory.client_product_id
      AND client_products.client_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all inventory"
  ON inventory FOR SELECT
  USING (is_admin());

CREATE POLICY "Admins can update inventory"
  ON inventory FOR UPDATE
  USING (is_admin());

CREATE POLICY "Admins can insert inventory"
  ON inventory FOR INSERT
  WITH CHECK (is_admin());

-- ============================================================================
-- ORDERS POLICIES
-- ============================================================================

CREATE POLICY "Clients can view own orders"
  ON orders FOR SELECT
  USING (auth.uid() = client_id);

CREATE POLICY "Admins can view all orders"
  ON orders FOR SELECT
  USING (is_admin());

CREATE POLICY "Clients can insert own orders"
  ON orders FOR INSERT
  WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Clients can update own orders"
  ON orders FOR UPDATE
  USING (auth.uid() = client_id AND status = 'quote');

CREATE POLICY "Admins can update any orders"
  ON orders FOR UPDATE
  USING (is_admin());

-- ============================================================================
-- ORDER_TIMELINE POLICIES
-- ============================================================================

CREATE POLICY "Clients can view own order timeline"
  ON order_timeline FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_timeline.order_id
      AND orders.client_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all order timelines"
  ON order_timeline FOR SELECT
  USING (is_admin());

CREATE POLICY "Admins can manage order timeline"
  ON order_timeline FOR ALL
  USING (is_admin());

-- ============================================================================
-- DELIVERIES POLICIES
-- ============================================================================

CREATE POLICY "Clients can view own deliveries"
  ON deliveries FOR SELECT
  USING (auth.uid() = client_id);

CREATE POLICY "Admins can view all deliveries"
  ON deliveries FOR SELECT
  USING (is_admin());

CREATE POLICY "Clients can insert own deliveries"
  ON deliveries FOR INSERT
  WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Admins can manage all deliveries"
  ON deliveries FOR ALL
  USING (is_admin());

-- ============================================================================
-- CONVERSATIONS POLICIES
-- ============================================================================

CREATE POLICY "Users can view own conversations"
  ON conversations FOR SELECT
  USING (
    auth.uid() = client_id OR 
    auth.uid() = admin_id OR
    is_admin()
  );

CREATE POLICY "Clients can create conversations"
  ON conversations FOR INSERT
  WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Admins can create conversations"
  ON conversations FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Participants can update conversations"
  ON conversations FOR UPDATE
  USING (auth.uid() = client_id OR auth.uid() = admin_id);

-- ============================================================================
-- MESSAGES POLICIES
-- ============================================================================

CREATE POLICY "Users can view conversation messages"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND (
        conversations.client_id = auth.uid() OR 
        conversations.admin_id = auth.uid() OR
        is_admin()
      )
    )
  );

CREATE POLICY "Users can send messages in their conversations"
  ON messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND (conversations.client_id = auth.uid() OR conversations.admin_id = auth.uid())
    )
  );

CREATE POLICY "Users can update own messages"
  ON messages FOR UPDATE
  USING (auth.uid() = sender_id);

-- ============================================================================
-- SAVED_QUOTES POLICIES
-- ============================================================================

CREATE POLICY "Clients can view own quotes"
  ON saved_quotes FOR SELECT
  USING (auth.uid() = client_id);

CREATE POLICY "Admins can view all quotes"
  ON saved_quotes FOR SELECT
  USING (is_admin());

CREATE POLICY "Clients can insert own quotes"
  ON saved_quotes FOR INSERT
  WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Clients can update own quotes"
  ON saved_quotes FOR UPDATE
  USING (auth.uid() = client_id);

CREATE POLICY "Clients can delete own quotes"
  ON saved_quotes FOR DELETE
  USING (auth.uid() = client_id);

-- ============================================================================
-- DOCUMENTS POLICIES
-- ============================================================================

CREATE POLICY "Clients can view own documents"
  ON documents FOR SELECT
  USING (auth.uid() = client_id);

CREATE POLICY "Admins can view all documents"
  ON documents FOR SELECT
  USING (is_admin());

CREATE POLICY "Admins can manage documents"
  ON documents FOR ALL
  USING (is_admin());

-- ============================================================================
-- PROMOTIONS POLICIES (public)
-- ============================================================================

CREATE POLICY "Anyone can view active promotions"
  ON promotions FOR SELECT
  USING (is_active = true AND valid_until >= CURRENT_DATE);

CREATE POLICY "Admins can manage promotions"
  ON promotions FOR ALL
  USING (is_admin());

-- ============================================================================
-- NOTIFICATIONS POLICIES
-- ============================================================================

CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications"
  ON notifications FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- USER_PREFERENCES POLICIES
-- ============================================================================

CREATE POLICY "Users can view own preferences"
  ON user_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
  ON user_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
  ON user_preferences FOR UPDATE
  USING (auth.uid() = user_id);
