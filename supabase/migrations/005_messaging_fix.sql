-- Fix for messaging: Allow clients to get an admin ID for conversations
-- This function bypasses RLS to return an admin user ID

CREATE OR REPLACE FUNCTION get_admin_for_conversation()
RETURNS UUID AS $$
DECLARE
  admin_id UUID;
BEGIN
  SELECT id INTO admin_id
  FROM profiles
  WHERE role = 'admin'
  LIMIT 1;

  RETURN admin_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_admin_for_conversation() TO authenticated;

-- Also add policy to allow admins to update conversations (for unread_count)
CREATE POLICY "Admins can update any conversation"
  ON conversations FOR UPDATE
  USING (is_admin());
