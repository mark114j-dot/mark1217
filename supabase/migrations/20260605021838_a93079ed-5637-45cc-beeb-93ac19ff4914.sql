
CREATE TABLE public.wallets (
  client_id text PRIMARY KEY,
  coins integer NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.wallets TO anon, authenticated;
GRANT ALL ON public.wallets TO service_role;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wallets_public_select" ON public.wallets FOR SELECT USING (true);
CREATE POLICY "wallets_public_insert" ON public.wallets FOR INSERT WITH CHECK (true);
CREATE POLICY "wallets_public_update" ON public.wallets FOR UPDATE USING (true) WITH CHECK (true);

CREATE TABLE public.owned_avatars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id text NOT NULL,
  avatar text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(client_id, avatar)
);
GRANT SELECT, INSERT ON public.owned_avatars TO anon, authenticated;
GRANT ALL ON public.owned_avatars TO service_role;
ALTER TABLE public.owned_avatars ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owned_public_select" ON public.owned_avatars FOR SELECT USING (true);
CREATE POLICY "owned_public_insert" ON public.owned_avatars FOR INSERT WITH CHECK (true);

CREATE TRIGGER touch_wallets_updated_at BEFORE UPDATE ON public.wallets
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
