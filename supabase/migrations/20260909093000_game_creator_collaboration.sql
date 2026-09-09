-- 免費創作者協作：遊戲建立者可以產生邀請連結，其他登入玩家接受後即可共同編輯。
CREATE TABLE IF NOT EXISTS public.game_collaborators (
  game_id uuid NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'editor' CHECK (role IN ('owner','editor')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (game_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.game_creator_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  inviter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  role text NOT NULL DEFAULT 'editor' CHECK (role = 'editor'),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','revoked')),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  accepted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  accepted_at timestamptz
);

ALTER TABLE public.game_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_creator_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "collaborators read own games" ON public.game_collaborators;
CREATE POLICY "collaborators read own games" ON public.game_collaborators FOR SELECT
  USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM public.games g WHERE g.id = game_id AND g.created_by = auth.uid()
  ) OR public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "invitations owner read" ON public.game_creator_invitations;
CREATE POLICY "invitations owner read" ON public.game_creator_invitations FOR SELECT
  USING (auth.uid() = inviter_id OR public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "invitations owner update" ON public.game_creator_invitations;
CREATE POLICY "invitations owner update" ON public.game_creator_invitations FOR UPDATE
  USING (auth.uid() = inviter_id OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (auth.uid() = inviter_id OR public.has_role(auth.uid(),'admin'));

GRANT SELECT ON public.game_collaborators TO authenticated;
GRANT SELECT, UPDATE ON public.game_creator_invitations TO authenticated;
GRANT ALL ON public.game_collaborators, public.game_creator_invitations TO service_role;

-- 建立遊戲時同步成為 owner。
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

  INSERT INTO public.game_collaborators(game_id, user_id, role)
  VALUES (new_id, auth.uid(), 'owner')
  ON CONFLICT DO NOTHING;

  RETURN QUERY SELECT games.id, games.slug, games.name, games.status
  FROM public.games WHERE games.id = new_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_game_creator_invitation(_game_id uuid)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_token text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION '請先登入'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.games WHERE id = _game_id AND created_by = auth.uid())
     AND NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION '只有遊戲建立者可以邀請創作者';
  END IF;

  INSERT INTO public.game_creator_invitations(game_id, inviter_id)
  VALUES (_game_id, auth.uid())
  RETURNING token INTO new_token;
  RETURN new_token;
END;
$$;

CREATE OR REPLACE FUNCTION public.accept_game_creator_invitation(_token text)
RETURNS TABLE (game_id uuid, role text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE inv public.game_creator_invitations%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION '請先登入'; END IF;
  SELECT * INTO inv FROM public.game_creator_invitations
  WHERE token = btrim(_token) AND status = 'pending' AND expires_at > now();
  IF NOT FOUND THEN RAISE EXCEPTION '邀請連結無效或已過期'; END IF;

  INSERT INTO public.game_collaborators(game_id, user_id, role)
  VALUES (inv.game_id, auth.uid(), 'editor')
  ON CONFLICT (game_id, user_id) DO UPDATE SET role = 'editor';

  UPDATE public.game_creator_invitations
  SET status = 'accepted', accepted_by = auth.uid(), accepted_at = now()
  WHERE id = inv.id;

  RETURN QUERY SELECT inv.game_id, 'editor'::text;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_collaborator_game(_game_id uuid, _html_content text)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION '請先登入'; END IF;
  IF btrim(_html_content) = '' THEN RAISE EXCEPTION '請輸入遊戲程式碼'; END IF;
  IF length(_html_content) > 500000 THEN RAISE EXCEPTION '遊戲程式碼不能超過 500 KB'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.game_collaborators
    WHERE game_id = _game_id AND user_id = auth.uid() AND role IN ('owner','editor')
  ) AND NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION '你不是這個遊戲的創作者';
  END IF;

  UPDATE public.games
  SET html_content = _html_content, version = COALESCE(version, 0) + 1
  WHERE id = _game_id;
  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_game_creator_invitation(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_game_creator_invitation(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_collaborator_game(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_player_game(text,text) TO authenticated;
