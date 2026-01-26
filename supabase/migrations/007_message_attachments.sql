-- Add attachment_url column to messages table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'attachment_url'
  ) THEN
    ALTER TABLE messages ADD COLUMN attachment_url TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'attachment_name'
  ) THEN
    ALTER TABLE messages ADD COLUMN attachment_name TEXT;
  END IF;
END $$;

-- Create storage bucket for message attachments (run this in Supabase Dashboard)
-- Go to Storage > Create new bucket > Name: message-attachments > Public: true
-- Add policies:
-- 1. Allow authenticated users to upload (INSERT)
-- 2. Allow authenticated users to read (SELECT)
