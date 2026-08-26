ALTER TABLE public.games ADD COLUMN IF NOT EXISTS play_count integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.increment_game_play(_slug text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.games SET play_count = play_count + 1 WHERE slug = _slug AND status = 'published';
$$;

GRANT EXECUTE ON FUNCTION public.increment_game_play(text) TO anon, authenticated;