-- Security hardening for room, mini-room, configuration and creator APIs.
-- Prevents cross-user room/state tampering while keeping normal authenticated play.

-- 1) Main rooms: only the authenticated host may mutate room state.
DROP POLICY IF EXISTS "public update rooms" ON public.rooms;
CREATE POLICY "room host update"
  ON public.rooms FOR UPDATE TO authenticated
  USING (host_user_id = auth.uid())
  WITH CHECK (host_user_id = auth.uid());

DROP POLICY IF EXISTS "insert rooms as self" ON public.rooms;
DROP POLICY IF EXISTS "public insert rooms" ON public.rooms;
CREATE POLICY "authenticated create rooms"
  ON public.rooms FOR INSERT TO authenticated
  WITH CHECK (host_user_id = auth.uid());

-- 2) Players: a signed-in player may only update their own player row.
DROP POLICY IF EXISTS "public update players" ON public.players;
CREATE POLICY "player update self"
  ON public.players FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Anonymous players can still join, but cannot mutate existing player rows.
-- Server/service-role remains able to manage them.

-- 3) Mini rooms: prevent arbitrary deletion and require the host identity for updates.
ALTER TABLE public.mini_rooms ADD COLUMN IF NOT EXISTS host_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
DROP POLICY IF EXISTS "public update mini_rooms" ON public.mini_rooms;
DROP POLICY IF EXISTS "public delete mini_rooms" ON public.mini_rooms;
DROP POLICY IF EXISTS "public insert mini_rooms" ON public.mini_rooms;

ALTER TABLE public.mini_rooms
  ADD COLUMN IF NOT EXISTS host_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE POLICY "authenticated create mini rooms"
  ON public.mini_rooms FOR INSERT TO authenticated
  WITH CHECK (host_user_id = auth.uid());

CREATE POLICY "mini room host update"
  ON public.mini_rooms FOR UPDATE TO authenticated
  USING (host_user_id = auth.uid())
  WITH CHECK (host_user_id = auth.uid());

-- Existing rows created before host_user_id existed are intentionally read-only
-- to clients until a trusted server flow assigns an owner.

-- 4) Site settings: only the public theme is readable by clients.
DROP POLICY IF EXISTS "site settings public read" ON public.site_settings;
CREATE POLICY "public theme read"
  ON public.site_settings FOR SELECT TO anon, authenticated
  USING (key = 'theme');

DROP POLICY IF EXISTS "site settings admin write" ON public.site_settings;
CREATE POLICY "site settings admin write"
  ON public.site_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

REVOKE INSERT, UPDATE, DELETE ON public.site_settings FROM anon, authenticated;
GRANT SELECT ON public.site_settings TO anon, authenticated;

-- 5) Tighten creator helper execution. These functions already authenticate
-- internally; keep only the intended authenticated surface and no PUBLIC access.
REVOKE ALL ON FUNCTION public.get_collaborator_game(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.list_my_creator_games() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_game_creator_invitation(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.accept_game_creator_invitation(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_collaborator_game(uuid,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_player_game(text,text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.get_collaborator_game(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_my_creator_games() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_game_creator_invitation(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_game_creator_invitation(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_collaborator_game(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_player_game(text,text) TO authenticated;
