-- ============================================================================
-- FIX PROFILES SYNC FROM AUTH METADATA
-- ============================================================================

-- 1. Update the handle_new_user trigger function to copy metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    email, 
    role,
    company_name,
    contact_name,
    phone
  )
  VALUES (
    NEW.id, 
    NEW.email, 
    'client',
    NEW.raw_user_meta_data->>'company_name',
    NEW.raw_user_meta_data->>'contact_name',
    NEW.raw_user_meta_data->>'phone'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Backfill existing profiles with missing data from auth.users
-- This ensures users who already signed up get their phone numbers populated
UPDATE public.profiles p
SET 
  company_name = COALESCE(p.company_name, u.raw_user_meta_data->>'company_name'),
  contact_name = COALESCE(p.contact_name, u.raw_user_meta_data->>'contact_name'),
  phone = COALESCE(p.phone, u.raw_user_meta_data->>'phone')
FROM auth.users u
WHERE p.id = u.id;
