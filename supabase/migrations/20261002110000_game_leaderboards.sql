-- Game leaderboards for embedded games
CREATE TABLE IF NOT EXISTS public.game_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  username text NOT NULL,
  avatar text NOT NULL DEFAULT '🎮',
  score bigint NOT NULL CHECK (score >= 0 AND score <= 1000000000),
  duration_ms integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS game_scores_game_score_idx
  ON public.game_scores (game_id, score DESC, created_at ASC);
CREATE INDEX IF NOT EXISTS game_scores_game_user_idx
  ON public.game_scores (game_id, user_id, score DESC);

ALTER TABLE public.game_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "game scores public read" ON public.game_scores;
CREATE POLICY "game scores public read"
  ON public.game_scores FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "game scores insert self" ON public.game_scores;
CREATE POLICY "game scores insert self"
  ON public.game_scores FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "game scores update self" ON public.game_scores;
CREATE POLICY "game scores update self"
  ON public.game_scores FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "game scores delete self" ON public.game_scores;
CREATE POLICY "game scores delete self"
  ON public.game_scores FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

ALTER TABLE public.game_scores REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'game_scores'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.game_scores;
  END IF;
END $$;
