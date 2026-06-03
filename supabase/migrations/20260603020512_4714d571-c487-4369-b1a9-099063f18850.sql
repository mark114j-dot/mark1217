
CREATE TABLE public.mini_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  game_type text NOT NULL,
  state jsonb NOT NULL DEFAULT '{}'::jsonb,
  players jsonb NOT NULL DEFAULT '[]'::jsonb,
  host_client_id text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_mini_rooms_code ON public.mini_rooms(code);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mini_rooms TO anon, authenticated;
GRANT ALL ON public.mini_rooms TO service_role;

ALTER TABLE public.mini_rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read mini_rooms" ON public.mini_rooms FOR SELECT USING (true);
CREATE POLICY "public insert mini_rooms" ON public.mini_rooms FOR INSERT WITH CHECK (true);
CREATE POLICY "public update mini_rooms" ON public.mini_rooms FOR UPDATE USING (true);
CREATE POLICY "public delete mini_rooms" ON public.mini_rooms FOR DELETE USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.mini_rooms;
ALTER TABLE public.mini_rooms REPLICA IDENTITY FULL;
