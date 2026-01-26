-- Add discount columns to offers table
ALTER TABLE public.offers 
ADD COLUMN IF NOT EXISTS discount_code TEXT,
ADD COLUMN IF NOT EXISTS discount_percent INTEGER;

-- Add check constraint for valid percentage (0-100)
ALTER TABLE public.offers 
ADD CONSTRAINT check_discount_percent 
CHECK (discount_percent >= 0 AND discount_percent <= 100);
