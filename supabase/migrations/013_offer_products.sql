-- Create offer_products junction table
CREATE TABLE IF NOT EXISTS public.offer_products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    offer_id UUID REFERENCES public.offers(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(offer_id, product_id)
);

-- Enable RLS
ALTER TABLE public.offer_products ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can do everything on offer_products"
ON public.offer_products
FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Everyone can view offer_products"
ON public.offer_products
FOR SELECT
TO authenticated
USING (true);
