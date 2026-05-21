
-- Rooms
CREATE TABLE public.rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'waiting', -- waiting | drawing | round_end
  round integer NOT NULL DEFAULT 0,
  max_rounds integer NOT NULL DEFAULT 5,
  current_drawer_id uuid,
  current_word text,
  word_hint text,
  round_ends_at timestamptz,
  host_client_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Players
CREATE TABLE public.players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  client_id text NOT NULL,
  name text NOT NULL,
  score integer NOT NULL DEFAULT 0,
  guessed_correctly boolean NOT NULL DEFAULT false,
  color text NOT NULL DEFAULT '#6366f1',
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(room_id, client_id)
);

-- Messages
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  player_name text NOT NULL,
  content text NOT NULL,
  is_correct boolean NOT NULL DEFAULT false,
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Strokes
CREATE TABLE public.strokes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  round integer NOT NULL DEFAULT 0,
  data jsonb NOT NULL, -- { type:'stroke'|'clear', points, color, size }
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_players_room ON public.players(room_id);
CREATE INDEX idx_messages_room ON public.messages(room_id, created_at);
CREATE INDEX idx_strokes_room ON public.strokes(room_id, created_at);

-- RLS — public game, fully open
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strokes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read rooms" ON public.rooms FOR SELECT USING (true);
CREATE POLICY "public insert rooms" ON public.rooms FOR INSERT WITH CHECK (true);
CREATE POLICY "public update rooms" ON public.rooms FOR UPDATE USING (true);

CREATE POLICY "public read players" ON public.players FOR SELECT USING (true);
CREATE POLICY "public insert players" ON public.players FOR INSERT WITH CHECK (true);
CREATE POLICY "public update players" ON public.players FOR UPDATE USING (true);
CREATE POLICY "public delete players" ON public.players FOR DELETE USING (true);

CREATE POLICY "public read messages" ON public.messages FOR SELECT USING (true);
CREATE POLICY "public insert messages" ON public.messages FOR INSERT WITH CHECK (true);

CREATE POLICY "public read strokes" ON public.strokes FOR SELECT USING (true);
CREATE POLICY "public insert strokes" ON public.strokes FOR INSERT WITH CHECK (true);
CREATE POLICY "public delete strokes" ON public.strokes FOR DELETE USING (true);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.players;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.strokes;

ALTER TABLE public.rooms REPLICA IDENTITY FULL;
ALTER TABLE public.players REPLICA IDENTITY FULL;
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.strokes REPLICA IDENTITY FULL;
