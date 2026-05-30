CREATE TABLE IF NOT EXISTS listener_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listener_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  message text NOT NULL,
  link text,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE listener_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ln_read_own" ON listener_notifications
  FOR SELECT USING (auth.uid() = listener_id);
CREATE POLICY "ln_update_own" ON listener_notifications
  FOR UPDATE USING (auth.uid() = listener_id);
CREATE POLICY "ln_service_insert" ON listener_notifications
  FOR INSERT TO service_role WITH CHECK (true);
ALTER PUBLICATION supabase_realtime ADD TABLE listener_notifications;
