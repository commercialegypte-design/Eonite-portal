-- Function to generate the next sequential order number
-- Runs with SECURITY DEFINER to bypass RLS and see all orders
CREATE OR REPLACE FUNCTION get_next_order_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_year TEXT;
  last_order_num TEXT;
  next_seq INTEGER;
  new_order_num TEXT;
BEGIN
  current_year := to_char(now(), 'YYYY');
  
  -- Select the last order number for the current year, ignoring RLS
  -- Format: CMD-YYYY-NNN
  SELECT order_number INTO last_order_num
  FROM orders
  WHERE order_number LIKE 'CMD-' || current_year || '-%'
  ORDER BY order_number DESC
  LIMIT 1;
  
  IF last_order_num IS NULL THEN
    next_seq := 1;
  ELSE
    -- Extract the sequence part (after CMD-YYYY-)
    -- CMD-YYYY- is 9 characters long
    next_seq := CAST(substring(last_order_num FROM 10) AS INTEGER) + 1;
  END IF;
  
  new_order_num := 'CMD-' || current_year || '-' || lpad(CAST(next_seq AS TEXT), 3, '0');
  
  RETURN new_order_num;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_next_order_number() TO authenticated;
