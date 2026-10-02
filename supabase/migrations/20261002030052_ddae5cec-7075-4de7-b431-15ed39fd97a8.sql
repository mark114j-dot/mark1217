-- strokes: limit public reads to recent rows (live gameplay only)
DROP POLICY IF EXISTS "public read strokes" ON public.strokes;
CREATE POLICY "read recent strokes" ON public.strokes
  FOR SELECT USING (created_at > now() - interval '7 days');

-- messages: limit public reads to recent rows
DROP POLICY IF EXISTS "public read messages" ON public.messages;
CREATE POLICY "read recent messages" ON public.messages
  FOR SELECT USING (created_at > now() - interval '7 days');

-- mini_rooms: validate inserted rows instead of accepting everything
DROP POLICY IF EXISTS "public insert mini_rooms" ON public.mini_rooms;
CREATE POLICY "insert mini_rooms with valid shape" ON public.mini_rooms
  FOR INSERT WITH CHECK (
    length(code) BETWEEN 4 AND 12
    AND length(game_type) BETWEEN 1 AND 40
    AND length(host_client_id) BETWEEN 1 AND 64
  );

-- game-icons storage: bind writes to the uploader's own folder
DROP POLICY IF EXISTS "game icons authenticated write" ON storage.objects;
CREATE POLICY "game icons owner write" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'game-icons' AND (storage.foldername(name))[1] = (select auth.uid()::text));

DROP POLICY IF EXISTS "game icons authenticated update" ON storage.objects;
CREATE POLICY "game icons owner update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'game-icons' AND (storage.foldername(name))[1] = (select auth.uid()::text));

DROP POLICY IF EXISTS "game icons authenticated delete" ON storage.objects;
CREATE POLICY "game icons owner delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'game-icons' AND (storage.foldername(name))[1] = (select auth.uid()::text));