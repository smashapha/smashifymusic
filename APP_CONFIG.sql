CREATE TABLE IF NOT EXISTS public.app_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default maintenance config
INSERT INTO public.app_config (key, value)
VALUES ('maintenance', '{"active": false}')
ON CONFLICT (key) DO NOTHING;

-- Only admins can update config
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "app_config_public_read"
  ON public.app_config FOR SELECT USING (true);

CREATE POLICY "app_config_admin_write"
  ON public.app_config FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true
  ));
