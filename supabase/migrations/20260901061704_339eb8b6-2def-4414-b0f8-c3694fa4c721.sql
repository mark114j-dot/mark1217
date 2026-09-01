-- =========================================================
-- 1. WALLETS + OWNED_AVATARS: no direct client access at all
-- =========================================================
DROP POLICY IF EXISTS "wallets_public_select" ON public.wallets;
DROP POLICY IF EXISTS "wallets_public_insert" ON public.wallets;
DROP POLICY IF EXISTS "wallets_public_update" ON public.wallets;
REVOKE ALL ON public.wallets FROM anon, authenticated;
GRANT ALL ON public.wallets TO service_role;

DROP POLICY IF EXISTS "owned_public_select" ON public.owned_avatars;
DROP POLICY IF EXISTS "owned_public_insert" ON public.owned_avatars;
REVOKE ALL ON public.owned_avatars FROM anon, authenticated;
GRANT ALL ON public.owned_avatars TO service_role;

-- =========================================================
-- 2. PROFILES: sign-in required to browse; invite codes hidden
-- =========================================================
DROP POLICY IF EXISTS "profiles read all" ON public.profiles;
CREATE POLICY "profiles readable by signed-in users"
  ON public.profiles FOR SELECT TO authenticated USING (true);
REVOKE SELECT (invite_code) ON public.profiles FROM anon, authenticated;

-- =========================================================
-- 3. EMOTE_BROADCASTS: never store/expose email addresses
-- =========================================================
UPDATE public.emote_broadcasts
   SET sender_name = split_part(sender_name, '@', 1)
 WHERE sender_name LIKE '%@%';

CREATE OR REPLACE FUNCTION public.emote_broadcasts_sanitize()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.sender_name IS NOT NULL THEN
    NEW.sender_name := left(split_part(NEW.sender_name, '@', 1), 40);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS emote_broadcasts_sanitize_tg ON public.emote_broadcasts;
CREATE TRIGGER emote_broadcasts_sanitize_tg
  BEFORE INSERT OR UPDATE ON public.emote_broadcasts
  FOR EACH ROW EXECUTE FUNCTION public.emote_broadcasts_sanitize();

DROP POLICY IF EXISTS "emote_broadcasts public read" ON public.emote_broadcasts;
CREATE POLICY "emote_broadcasts recent read"
  ON public.emote_broadcasts FOR SELECT
  USING (created_at > now() - interval '10 minutes');

-- =========================================================
-- 4. ROOM_JOIN_REQUESTS: only requester or room host
-- =========================================================
DROP POLICY IF EXISTS "rjr read all" ON public.room_join_requests;
DROP POLICY IF EXISTS "rjr update all" ON public.room_join_requests;

CREATE POLICY "rjr read involved"
  ON public.room_join_requests FOR SELECT
  USING (
    auth.uid() = requester_id
    OR EXISTS (
      SELECT 1 FROM public.rooms r
      WHERE r.id = room_join_requests.room_id
        AND (r.host_user_id = auth.uid() OR r.host_user_id IS NULL)
    )
  );

CREATE POLICY "rjr update by host"
  ON public.room_join_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.rooms r
      WHERE r.id = room_join_requests.room_id
        AND (r.host_user_id = auth.uid() OR r.host_user_id IS NULL)
    )
  )
  WITH CHECK (status IN ('pending', 'approved', 'denied'));

-- =========================================================
-- 5. MESSAGES: must target a real room and a real participant
-- =========================================================
DROP POLICY IF EXISTS "public insert messages" ON public.messages;
CREATE POLICY "insert messages as room participant"
  ON public.messages FOR INSERT
  WITH CHECK (
    length(content) BETWEEN 1 AND 500
    AND length(player_name) BETWEEN 1 AND 40
    AND EXISTS (SELECT 1 FROM public.rooms r WHERE r.id = messages.room_id)
    AND (
      player_name = '系統'
      OR EXISTS (
        SELECT 1 FROM public.players p
        WHERE p.room_id = messages.room_id AND p.name = messages.player_name
      )
    )
  );

-- =========================================================
-- 6. STROKES: only into existing, live rooms
-- =========================================================
DROP POLICY IF EXISTS "public insert strokes" ON public.strokes;
DROP POLICY IF EXISTS "public delete strokes" ON public.strokes;

CREATE POLICY "insert strokes into live room"
  ON public.strokes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.rooms r
      WHERE r.id = strokes.room_id
        AND r.status <> 'finished'
        AND r.round = strokes.round
    )
  );

CREATE POLICY "delete strokes of live room"
  ON public.strokes FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.rooms r
      WHERE r.id = strokes.room_id AND r.status <> 'finished'
    )
  );

-- =========================================================
-- 7. PLAYERS: no deletion; identity columns frozen
-- =========================================================
DROP POLICY IF EXISTS "public delete players" ON public.players;
DROP POLICY IF EXISTS "public insert players" ON public.players;
CREATE POLICY "insert players into existing room"
  ON public.players FOR INSERT
  WITH CHECK (
    length(name) BETWEEN 1 AND 40
    AND (user_id IS NULL OR user_id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.rooms r WHERE r.id = players.room_id)
  );

CREATE OR REPLACE FUNCTION public.players_freeze_identity()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.room_id := OLD.room_id;
  NEW.client_id := OLD.client_id;
  NEW.user_id := OLD.user_id;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS players_freeze_identity_tg ON public.players;
CREATE TRIGGER players_freeze_identity_tg
  BEFORE UPDATE ON public.players
  FOR EACH ROW EXECUTE FUNCTION public.players_freeze_identity();

-- =========================================================
-- 8. ROOMS / MINI_ROOMS: ownership columns cannot be hijacked
-- =========================================================
CREATE OR REPLACE FUNCTION public.rooms_freeze_identity()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.code := OLD.code;
  NEW.host_client_id := OLD.host_client_id;
  NEW.host_user_id := OLD.host_user_id;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS rooms_freeze_identity_tg ON public.rooms;
CREATE TRIGGER rooms_freeze_identity_tg
  BEFORE UPDATE ON public.rooms
  FOR EACH ROW EXECUTE FUNCTION public.rooms_freeze_identity();

DROP POLICY IF EXISTS "public insert rooms" ON public.rooms;
CREATE POLICY "insert rooms as self"
  ON public.rooms FOR INSERT
  WITH CHECK (host_user_id IS NULL OR host_user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.mini_rooms_freeze_identity()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.code := OLD.code;
  NEW.host_client_id := OLD.host_client_id;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS mini_rooms_freeze_identity_tg ON public.mini_rooms;
CREATE TRIGGER mini_rooms_freeze_identity_tg
  BEFORE UPDATE ON public.mini_rooms
  FOR EACH ROW EXECUTE FUNCTION public.mini_rooms_freeze_identity();

DROP POLICY IF EXISTS "public delete mini_rooms" ON public.mini_rooms;

-- =========================================================
-- 9. FUNCTION HARDENING: fixed search_path + tight EXECUTE
-- =========================================================
ALTER FUNCTION public.gen_invite_code() SET search_path = public;
ALTER FUNCTION public.profiles_set_invite_code() SET search_path = public;
ALTER FUNCTION public.touch_updated_at() SET search_path = public;
ALTER FUNCTION public.tg_touch_updated_at() SET search_path = public;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.bootstrap_admin() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.grant_admin_for_verified_email() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.add_gems(text, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.spend_gems(text, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.gen_invite_code() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.profiles_set_invite_code() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tg_touch_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.emote_broadcasts_sanitize() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.players_freeze_identity() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rooms_freeze_identity() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.mini_rooms_freeze_identity() FROM PUBLIC, anon, authenticated;