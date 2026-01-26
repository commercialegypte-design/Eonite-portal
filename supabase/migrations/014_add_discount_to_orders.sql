-- Add discount columns to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS discount_code TEXT,
ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10, 2) DEFAULT 0;
