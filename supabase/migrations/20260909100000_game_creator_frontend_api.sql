-- 創作者協作前端所需的安全讀取 API。
CREATE OR REPLACE FUNCTION public.get_collaborator_game(_game_id uuid)
RETURNS TABLE (id uuid, slug text, name text, html_content text, version integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION '請先登入'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.game_collaborators
    WHERE game_id = _game_id AND user_id = auth.uid() AND role IN ('owner','editor')
  ) AND NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION '你不是這個遊戲的創作者';
  END IF;
  RETURN QUERY
    SELECT g.id, g.slug, g.name, g.html_content, COALESCE(g.version, 1)
    FROM public.games g WHERE g.id = _game_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_my_creator_games()
RETURNS TABLE (id uuid, slug text, name text, role text, version integer, created_at timestamptz)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT g.id, g.slug, g.name, c.role, COALESCE(g.version,1), g.created_at
  FROM public.game_collaborators c
  JOIN public.games g ON g.id = c.game_id
  WHERE c.user_id = auth.uid()
  ORDER BY g.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_collaborator_game(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_my_creator_games() TO authenticated;
