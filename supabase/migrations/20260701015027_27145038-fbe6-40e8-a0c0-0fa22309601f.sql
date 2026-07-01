-- ============ Roles ============
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users read own roles" ON public.user_roles;
CREATE POLICY "users read own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- ============ Games registry ============
CREATE TABLE IF NOT EXISTS public.games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  emoji TEXT NOT NULL DEFAULT '🎮',
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'party',
  tags TEXT[] NOT NULL DEFAULT '{}',
  primitive TEXT NOT NULL DEFAULT 'choice-story', -- grid-board | card-match | reaction | choice-story | math-quiz | word-quiz
  spec JSONB NOT NULL DEFAULT '{}'::jsonb,
  modes JSONB NOT NULL DEFAULT '{"single":true,"ai":false,"online":false,"ranked":false}'::jsonb,
  min_players INT NOT NULL DEFAULT 1,
  max_players INT NOT NULL DEFAULT 2,
  status TEXT NOT NULL DEFAULT 'draft', -- draft | published | archived
  version INT NOT NULL DEFAULT 1,
  cover_color TEXT NOT NULL DEFAULT '#8b5cf6',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.games TO anon, authenticated;
GRANT ALL ON public.games TO service_role;
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public read published games" ON public.games;
CREATE POLICY "public read published games" ON public.games
  FOR SELECT TO anon, authenticated USING (status = 'published' OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "admins manage games" ON public.games;
CREATE POLICY "admins manage games" ON public.games
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ Game versions (history) ============
CREATE TABLE IF NOT EXISTS public.game_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  version INT NOT NULL,
  spec JSONB NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (game_id, version)
);
GRANT SELECT ON public.game_versions TO authenticated;
GRANT ALL ON public.game_versions TO service_role;
ALTER TABLE public.game_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins read versions" ON public.game_versions;
CREATE POLICY "admins read versions" ON public.game_versions
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "admins write versions" ON public.game_versions;
CREATE POLICY "admins write versions" ON public.game_versions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ Studio chat sessions ============
CREATE TABLE IF NOT EXISTS public.studio_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL DEFAULT '未命名專案',
  game_id UUID REFERENCES public.games(id) ON DELETE SET NULL,
  folder TEXT NOT NULL DEFAULT '',
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  draft_spec JSONB NOT NULL DEFAULT '{}'::jsonb,
  progress INT NOT NULL DEFAULT 0,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.studio_sessions TO authenticated;
GRANT ALL ON public.studio_sessions TO service_role;
ALTER TABLE public.studio_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins manage own sessions" ON public.studio_sessions;
CREATE POLICY "admins manage own sessions" ON public.studio_sessions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') AND owner_id = auth.uid())
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND owner_id = auth.uid());

-- ============ Admin audit log ============
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  target TEXT,
  detail JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.admin_audit_log TO authenticated;
GRANT ALL ON public.admin_audit_log TO service_role;
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admins read audit" ON public.admin_audit_log;
CREATE POLICY "admins read audit" ON public.admin_audit_log
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============ Bootstrap: first user becomes admin ============
CREATE OR REPLACE FUNCTION public.bootstrap_admin()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin') ON CONFLICT DO NOTHING;
  END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS on_auth_user_created_bootstrap_admin ON auth.users;
CREATE TRIGGER on_auth_user_created_bootstrap_admin
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.bootstrap_admin();

-- Grant admin to every existing user only if there is no admin yet — makes YOU (the first existing user) admin.
DO $$
DECLARE first_uid uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    SELECT id INTO first_uid FROM auth.users ORDER BY created_at ASC LIMIT 1;
    IF first_uid IS NOT NULL THEN
      INSERT INTO public.user_roles (user_id, role) VALUES (first_uid, 'admin') ON CONFLICT DO NOTHING;
    END IF;
  END IF;
END $$;

-- Also mirror existing users into 'user' role
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'user' FROM auth.users ON CONFLICT DO NOTHING;

-- updated_at triggers
CREATE OR REPLACE FUNCTION public.tg_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS games_touch ON public.games;
CREATE TRIGGER games_touch BEFORE UPDATE ON public.games
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

DROP TRIGGER IF EXISTS studio_touch ON public.studio_sessions;
CREATE TRIGGER studio_touch BEFORE UPDATE ON public.studio_sessions
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();