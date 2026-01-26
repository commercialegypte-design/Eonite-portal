-- Create offers table
CREATE TABLE IF NOT EXISTS public.offers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    image_url TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

-- Policies for offers table
CREATE POLICY "Admins can do everything on offers"
ON public.offers
FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Everyone can view active offers"
ON public.offers
FOR SELECT
TO authenticated
USING (is_active = true);

-- Storage bucket for offers (try to insert if not exists)
-- Note: You might need to manually create the 'offers' public bucket in Supabase Dashboard if this fails
INSERT INTO storage.buckets (id, name, public)
VALUES ('offers', 'offers', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for offers bucket
CREATE POLICY "Public Access to Offer Images"
ON storage.objects FOR SELECT
USING ( bucket_id = 'offers' );

CREATE POLICY "Admins can upload offer images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'offers' AND is_admin() );

CREATE POLICY "Admins can update offer images"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'offers' AND is_admin() );

CREATE POLICY "Admins can delete offer images"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'offers' AND is_admin() );
