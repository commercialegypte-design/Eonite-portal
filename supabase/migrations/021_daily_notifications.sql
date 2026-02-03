-- Daily.co notifications table for real-time admin alerts
-- Stores webhook events from Daily.co (participant joined, meeting ended)

-- Create notification type enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
        CREATE TYPE notification_type AS ENUM ('participant_joined', 'meeting_ended');
    END IF;
END$$;

-- Create daily_notifications table
CREATE TABLE IF NOT EXISTS daily_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  notification_type notification_type NOT NULL,
  room_name TEXT NOT NULL,
  participant_name TEXT,
  participant_id TEXT,
  event_data JSONB,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_daily_notifications_created_at ON daily_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_daily_notifications_is_read ON daily_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_daily_notifications_type ON daily_notifications(notification_type);

-- Enable Row Level Security
ALTER TABLE daily_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Admins can view all notifications
CREATE POLICY "Admins can view all notifications" ON daily_notifications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'designer')
    )
  );

-- Admins can update notifications (mark as read)
CREATE POLICY "Admins can update notifications" ON daily_notifications
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'designer')
    )
  );

-- System can insert new notifications (for webhook endpoint)
CREATE POLICY "System can insert notifications" ON daily_notifications
  FOR INSERT WITH CHECK (true);

-- Admins can delete old notifications
CREATE POLICY "Admins can delete notifications" ON daily_notifications
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'designer')
    )
  );

-- CRITICAL: Enable Realtime for this table
alter publication supabase_realtime add table daily_notifications;
