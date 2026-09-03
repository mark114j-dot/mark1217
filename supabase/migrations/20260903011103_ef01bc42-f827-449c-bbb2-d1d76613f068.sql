-- Open AI Game Studio to all authenticated users while keeping admin audit/delete powers.

-- 1. studio_sessions: owners can CRUD; community can read published sessions; admins can do anything.
DROP POLICY IF EXISTS "admins manage own sessions" ON public.studio_sessions;

CREATE POLICY "studio sessions owner full access" ON public.studio_sessions
  FOR ALL TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "studio sessions community read" ON public.studio_sessions
  FOR SELECT TO authenticated
  USING (folder = 'published');

-- 2. games: any authenticated user can publish/update/delete their own games; admins retain full control.
DROP POLICY IF EXISTS "admins manage games" ON public.games;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.games TO authenticated;

CREATE POLICY "games owner manage" ON public.games
  FOR ALL TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Keep the public published-game read path.
DROP POLICY IF EXISTS "public read published games" ON public.games;
CREATE POLICY "public read published games" ON public.games
  FOR SELECT TO anon, authenticated USING (status = 'published' OR public.has_role(auth.uid(), 'admin'));

-- 3. game_versions: owners/admins can create versions for games they own.
GRANT INSERT, UPDATE, DELETE ON public.game_versions TO authenticated;

DROP POLICY IF EXISTS "admins read versions" ON public.game_versions;
DROP POLICY IF EXISTS "admins write versions" ON public.game_versions;

CREATE POLICY "game versions owner/admin access" ON public.game_versions
  FOR ALL TO authenticated
  USING (
    created_by = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.games g WHERE g.id = game_versions.game_id AND g.created_by = auth.uid())
  )
  WITH CHECK (
    created_by = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.games g WHERE g.id = game_versions.game_id AND g.created_by = auth.uid())
  );

-- 4. storage game-icons: any authenticated user can upload/update/delete game icons.
DROP POLICY IF EXISTS "game icons admin write" ON storage.objects;
DROP POLICY IF EXISTS "game icons admin update" ON storage.objects;
DROP POLICY IF EXISTS "game icons admin delete" ON storage.objects;

CREATE POLICY "game icons authenticated write" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'game-icons');

CREATE POLICY "game icons authenticated update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'game-icons');

CREATE POLICY "game icons authenticated delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'game-icons');
