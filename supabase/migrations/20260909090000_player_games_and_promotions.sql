-- 玩家可自行發布 HTML 遊戲；遊戲內容會在前端 iframe sandbox 中執行。
ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS featured boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS promotion_text text,
  ADD COLUMN IF NOT EXISTS featured_until timestamptz;

CREATE TABLE IF NOT EXISTS public.game_promotion_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

GRANT SELECT ON public.game_promotion_requests TO authenticated;
GRANT INSERT ON public.game_promotion_requests TO authenticated;
GRANT ALL ON public.game_promotion_requests TO service_role;
ALTER TABLE public.game_promotion_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "promotion requests own read" ON public.game_promotion_requests;
CREATE POLICY "promotion requests own read" ON public.game_promotion_requests FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "promotion requests own insert" ON public.game_promotion_requests;
CREATE POLICY "promotion requests own insert" ON public.game_promotion_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "promotion requests admin update" ON public.game_promotion_requests;
CREATE POLICY "promotion requests admin update" ON public.game_promotion_requests FOR UPDATE
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- 不依賴 AI，登入玩家即可建立遊戲。SECURITY DEFINER 讓既有 games RLS 不必放寬到任意欄位。
CREATE OR REPLACE FUNCTION public.create_player_game(_name text, _html_content text)
RETURNS TABLE (id uuid, slug text, name text, status text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  clean_name text := btrim(_name);
  clean_html text := btrim(_html_content);
  base_slug text;
  candidate text;
  suffix integer := 1;
  new_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION '請先登入'; END IF;
  IF clean_name = '' THEN RAISE EXCEPTION '請輸入遊戲名稱'; END IF;
  IF clean_html = '' THEN RAISE EXCEPTION '請貼上遊戲程式碼'; END IF;
  IF length(clean_html) > 500000 THEN RAISE EXCEPTION '遊戲程式碼不能超過 500 KB'; END IF;

  base_slug := lower(regexp_replace(clean_name, '[^a-zA-Z0-9一-龥]+', '-', 'g'));
  base_slug := trim(both '-' from left(base_slug, 50));
  IF base_slug = '' THEN base_slug := 'game-' || substr(replace(gen_random_uuid()::text,'-',''),1,8); END IF;

  candidate := base_slug;
  WHILE EXISTS (SELECT 1 FROM public.games WHERE games.slug = candidate) LOOP
    suffix := suffix + 1;
    candidate := left(base_slug, 50 - length(suffix::text) - 1) || '-' || suffix::text;
  END LOOP;

  INSERT INTO public.games (
    slug, name, emoji, description, category, primitive, spec,
    min_players, max_players, html_content, play_url, cover_image_url,
    instructions, offline_ok, status, version, created_by
  ) VALUES (
    candidate, clean_name, '🎮', '玩家自行製作的遊戲', 'misc', 'custom',
    jsonb_build_object('source','player'), 1, 1, clean_html, NULL, NULL,
    NULL, false, 'published', 1, auth.uid()
  ) RETURNING games.id INTO new_id;

  RETURN QUERY SELECT games.id, games.slug, games.name, games.status
  FROM public.games WHERE games.id = new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_player_game(text,text) TO authenticated;
