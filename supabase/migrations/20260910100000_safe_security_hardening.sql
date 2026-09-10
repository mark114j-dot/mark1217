-- Safe security hardening. This migration only tightens existing objects and
-- deliberately avoids changing the room gameplay authorization model in a way
-- that would break anonymous play.

-- 1) Site configuration: the browser only needs the public theme setting.
DROP POLICY IF EXISTS "site settings public read" ON public.site_settings;
CREATE POLICY "site theme public read"
  ON public.site_settings FOR SELECT
  TO anon, authenticated
  USING (key = 'theme');

-- Only administrators can change site settings.
DROP POLICY IF EXISTS "site settings admin write" ON public.site_settings;
CREATE POLICY "site settings admin write"
  ON public.site_settings FOR ALL
  TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'))
  WITH CHECK (public.has_role((select auth.uid()), 'admin'));

-- 2) Profiles: keep normal social/profile fields usable, but keep invite_code
-- out of the Data API. Invite-code operations already use the trusted server fn.
REVOKE SELECT ON public.profiles FROM anon;
REVOKE SELECT ON public.profiles FROM authenticated;
GRANT SELECT (
  id, username, avatar, is_online, last_seen, current_room_code,
  country, language, created_at, updated_at
) ON public.profiles TO authenticated;

DROP POLICY IF EXISTS "profiles readable by signed-in users" ON public.profiles;
DROP POLICY IF EXISTS "profiles read all" ON public.profiles;
CREATE POLICY "profiles safe fields for signed-in users"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

-- 3) Profile writes remain self-only. Do not expose invite_code through client
-- INSERT/UPDATE privileges.
REVOKE INSERT, UPDATE ON public.profiles FROM anon;
GRANT UPDATE (
  username, avatar, is_online, last_seen, current_room_code, country, language
) ON public.profiles TO authenticated;
DROP POLICY IF EXISTS "profiles insert self" ON public.profiles;
DROP POLICY IF EXISTS "profiles update self" ON public.profiles;
CREATE POLICY "profiles insert self"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = id);
CREATE POLICY "profiles update self"
  ON public.profiles FOR UPDATE TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

-- 4) Creator invitation tokens are capability secrets. Clients can only see
-- invitations they created; acceptance happens through the guarded RPC.
REVOKE INSERT, DELETE ON public.game_creator_invitations FROM anon, authenticated;

-- 5) Add bounded payload checks to high-traffic realtime tables. These checks
-- reject malformed/oversized data before it reaches realtime subscribers.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'messages_content_length'
  ) THEN
    ALTER TABLE public.messages ADD CONSTRAINT messages_content_length
      CHECK (length(content) BETWEEN 1 AND 500);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'messages_player_name_length'
  ) THEN
    ALTER TABLE public.messages ADD CONSTRAINT messages_player_name_length
      CHECK (length(player_name) BETWEEN 1 AND 40);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'players_name_length'
  ) THEN
    ALTER TABLE public.players ADD CONSTRAINT players_name_length
      CHECK (length(name) BETWEEN 1 AND 40);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'mini_rooms_state_size'
  ) THEN
    ALTER TABLE public.mini_rooms ADD CONSTRAINT mini_rooms_state_size
      CHECK (pg_column_size(state) <= 200000);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'mini_rooms_players_size'
  ) THEN
    ALTER TABLE public.mini_rooms ADD CONSTRAINT mini_rooms_players_size
      CHECK (pg_column_size(players) <= 100000);
  END IF;
END $$;

-- 6) SECURITY DEFINER helpers used by the browser must never resolve objects
-- outside public/pg_temp through a caller-controlled search_path.
ALTER FUNCTION public.create_player_game(text, text)
  SET search_path = public, pg_temp;
ALTER FUNCTION public.create_game_creator_invitation(uuid)
  SET search_path = public, pg_temp;
ALTER FUNCTION public.accept_game_creator_invitation(text)
  SET search_path = public, pg_temp;
ALTER FUNCTION public.update_collaborator_game(uuid, text)
  SET search_path = public, pg_temp;
ALTER FUNCTION public.has_role(uuid, public.app_role)
  SET search_path = public, pg_temp;
