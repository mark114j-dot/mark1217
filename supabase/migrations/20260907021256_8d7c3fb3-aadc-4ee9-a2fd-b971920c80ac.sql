CREATE TABLE public.site_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.site_settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_settings TO authenticated;
GRANT ALL ON public.site_settings TO service_role;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "site settings public read" ON public.site_settings FOR SELECT USING (true);
CREATE POLICY "site settings admin write" ON public.site_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER site_settings_touch BEFORE UPDATE ON public.site_settings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.admin_ai_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES auth.users(id),
  summary text NOT NULL DEFAULT '',
  ops jsonb NOT NULL DEFAULT '[]'::jsonb,
  before_snapshot jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  applied_at timestamptz,
  reverted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_ai_changes TO authenticated;
GRANT ALL ON public.admin_ai_changes TO service_role;
ALTER TABLE public.admin_ai_changes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin ai changes admin only" ON public.admin_ai_changes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER admin_ai_changes_touch BEFORE UPDATE ON public.admin_ai_changes
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX admin_ai_changes_created_idx ON public.admin_ai_changes (created_at DESC);