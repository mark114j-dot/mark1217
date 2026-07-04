
-- 1) profiles: country, language, invite_code
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'zh-Hant',
  ADD COLUMN IF NOT EXISTS invite_code text UNIQUE;

CREATE OR REPLACE FUNCTION public.gen_invite_code() RETURNS text
LANGUAGE plpgsql AS $$
DECLARE c text;
BEGIN
  LOOP
    c := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE invite_code = c);
  END LOOP;
  RETURN c;
END $$;

UPDATE public.profiles SET invite_code = public.gen_invite_code() WHERE invite_code IS NULL;

CREATE OR REPLACE FUNCTION public.profiles_set_invite_code() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.invite_code IS NULL THEN NEW.invite_code := public.gen_invite_code(); END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS profiles_before_insert_invite ON public.profiles;
CREATE TRIGGER profiles_before_insert_invite BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_set_invite_code();

-- 2) wallets: gems
ALTER TABLE public.wallets
  ADD COLUMN IF NOT EXISTS gems integer NOT NULL DEFAULT 0;

-- 3) announcements
CREATE TABLE IF NOT EXISTS public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('update','event','maintenance','urgent')),
  title text NOT NULL,
  body text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  block_play boolean NOT NULL DEFAULT false,
  require_typing boolean NOT NULL DEFAULT false,
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.announcements TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcements TO authenticated;
GRANT ALL ON public.announcements TO service_role;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "announcements read active" ON public.announcements;
CREATE POLICY "announcements read active" ON public.announcements FOR SELECT
  USING (active OR public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "announcements admin write" ON public.announcements;
CREATE POLICY "announcements admin write" ON public.announcements FOR ALL
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
DROP TRIGGER IF EXISTS announcements_touch ON public.announcements;
CREATE TRIGGER announcements_touch BEFORE UPDATE ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 4) shop_emotes
CREATE TABLE IF NOT EXISTS public.shop_emotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  gif_url text NOT NULL,
  gem_price integer NOT NULL CHECK (gem_price >= 0),
  display_mode text NOT NULL DEFAULT 'fullscreen' CHECK (display_mode IN ('fullscreen','bar')),
  active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.shop_emotes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shop_emotes TO authenticated;
GRANT ALL ON public.shop_emotes TO service_role;
ALTER TABLE public.shop_emotes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "emotes read active" ON public.shop_emotes;
CREATE POLICY "emotes read active" ON public.shop_emotes FOR SELECT
  USING (active OR public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "emotes admin write" ON public.shop_emotes;
CREATE POLICY "emotes admin write" ON public.shop_emotes FOR ALL
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
DROP TRIGGER IF EXISTS shop_emotes_touch ON public.shop_emotes;
CREATE TRIGGER shop_emotes_touch BEFORE UPDATE ON public.shop_emotes
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 5) owned_emotes
CREATE TABLE IF NOT EXISTS public.owned_emotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emote_id uuid NOT NULL REFERENCES public.shop_emotes(id) ON DELETE CASCADE,
  price_paid integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, emote_id)
);
GRANT SELECT, INSERT ON public.owned_emotes TO authenticated;
GRANT ALL ON public.owned_emotes TO service_role;
ALTER TABLE public.owned_emotes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "owned_emotes self read" ON public.owned_emotes;
CREATE POLICY "owned_emotes self read" ON public.owned_emotes FOR SELECT
  USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "owned_emotes self insert" ON public.owned_emotes;
CREATE POLICY "owned_emotes self insert" ON public.owned_emotes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 6) invite_claims
CREATE TABLE IF NOT EXISTS public.invite_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reward_gems integer NOT NULL DEFAULT 10,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (invited_id)
);
GRANT SELECT ON public.invite_claims TO authenticated;
GRANT ALL ON public.invite_claims TO service_role;
ALTER TABLE public.invite_claims ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "invite_claims read own" ON public.invite_claims;
CREATE POLICY "invite_claims read own" ON public.invite_claims FOR SELECT
  USING (auth.uid() = referrer_id OR auth.uid() = invited_id OR public.has_role(auth.uid(),'admin'));

-- 7) gem transfer helper (used by server functions with service role)
CREATE OR REPLACE FUNCTION public.spend_gems(_client_id text, _amount integer)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cur integer;
BEGIN
  IF _amount <= 0 THEN RAISE EXCEPTION 'invalid amount'; END IF;
  SELECT gems INTO cur FROM public.wallets WHERE client_id = _client_id FOR UPDATE;
  IF cur IS NULL THEN
    INSERT INTO public.wallets(client_id, coins, gems) VALUES (_client_id, 100, 0)
    ON CONFLICT (client_id) DO NOTHING;
    cur := 0;
  END IF;
  IF cur < _amount THEN RAISE EXCEPTION 'insufficient gems'; END IF;
  UPDATE public.wallets SET gems = gems - _amount WHERE client_id = _client_id;
  RETURN cur - _amount;
END $$;

CREATE OR REPLACE FUNCTION public.add_gems(_client_id text, _amount integer)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cur integer;
BEGIN
  IF _amount <= 0 THEN RAISE EXCEPTION 'invalid amount'; END IF;
  INSERT INTO public.wallets(client_id, coins, gems) VALUES (_client_id, 100, _amount)
  ON CONFLICT (client_id) DO UPDATE SET gems = public.wallets.gems + EXCLUDED.gems
  RETURNING gems INTO cur;
  RETURN cur;
END $$;

-- Realtime for cross-tab emote broadcasts via emote_events (optional log)
CREATE TABLE IF NOT EXISTS public.emote_broadcasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code text NOT NULL,
  emote_id uuid NOT NULL REFERENCES public.shop_emotes(id) ON DELETE CASCADE,
  gif_url text NOT NULL,
  display_mode text NOT NULL,
  sender_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  sender_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.emote_broadcasts TO authenticated;
GRANT SELECT ON public.emote_broadcasts TO anon;
GRANT ALL ON public.emote_broadcasts TO service_role;
ALTER TABLE public.emote_broadcasts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "emote_broadcasts public read" ON public.emote_broadcasts;
CREATE POLICY "emote_broadcasts public read" ON public.emote_broadcasts FOR SELECT USING (true);
DROP POLICY IF EXISTS "emote_broadcasts owner insert" ON public.emote_broadcasts;
CREATE POLICY "emote_broadcasts owner insert" ON public.emote_broadcasts FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.emote_broadcasts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;
