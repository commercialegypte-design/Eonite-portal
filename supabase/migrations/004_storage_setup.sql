-- Storage buckets configuration
-- Run these in Supabase Dashboard → Storage → Create buckets

-- 1. Create buckets (do this via Supabase Dashboard UI or via SQL)

-- BAT files (client designs)
INSERT INTO storage.buckets (id, name, public) VALUES ('bat-files', 'bat-files', false);

-- Invoices
INSERT INTO storage.buckets (id, name, public) VALUES ('invoices', 'invoices', false);

-- Delivery notes
INSERT INTO storage.buckets (id, name, public) VALUES ('delivery-notes', 'delivery-notes', false);

-- Client logos
INSERT INTO storage.buckets (id, name, public) VALUES ('client-logos', 'client-logos', false);

-- Product images (public)
INSERT INTO storage.buckets (id, name, public) VALUES ('product-images', 'product-images', true);

-- Message attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('message-attachments', 'message-attachments', false);

-- ============================================================================
-- Storage Policies
-- ============================================================================

-- BAT Files Policies
CREATE POLICY "Users can view own BAT files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'bat-files' AND 
    (auth.uid()::text = (storage.foldername(name))[1] OR is_admin())
  );

CREATE POLICY "Admins can upload BAT files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'bat-files' AND is_admin());

CREATE POLICY "Admins can update BAT files"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'bat-files' AND is_admin());

-- Invoices Policies
CREATE POLICY "Users can view own invoices"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'invoices' AND 
    (auth.uid()::text = (storage.foldername(name))[1] OR is_admin())
  );

CREATE POLICY "Admins can manage invoices"
  ON storage.objects FOR ALL
  USING (bucket_id = 'invoices' AND is_admin());

-- Delivery Notes Policies
CREATE POLICY "Users can view own delivery notes"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'delivery-notes' AND 
    (auth.uid()::text = (storage.foldername(name))[1] OR is_admin())
  );

CREATE POLICY "Admins can manage delivery notes"
  ON storage.objects FOR ALL
  USING (bucket_id = 'delivery-notes' AND is_admin());

-- Client Logos Policies
CREATE POLICY "Users can view own logos"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'client-logos' AND 
    (auth.uid()::text = (storage.foldername(name))[1] OR is_admin())
  );

CREATE POLICY "Users can upload own logos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'client-logos' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Product Images Policies (public bucket)
CREATE POLICY "Anyone can view product images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');

CREATE POLICY "Admins can manage product images"
  ON storage.objects FOR ALL
  USING (bucket_id = 'product-images' AND is_admin());

-- Message Attachments Policies
CREATE POLICY "Users can view attachments in their conversations"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'message-attachments' AND 
    (auth.uid()::text = (storage.foldername(name))[1] OR is_admin())
  );

CREATE POLICY "Users can upload attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'message-attachments' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );
