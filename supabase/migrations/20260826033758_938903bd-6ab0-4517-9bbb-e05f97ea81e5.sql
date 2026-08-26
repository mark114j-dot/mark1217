DROP POLICY IF EXISTS "game icons read" ON storage.objects;
DROP POLICY IF EXISTS "game icons admin write" ON storage.objects;
DROP POLICY IF EXISTS "game icons admin update" ON storage.objects;
DROP POLICY IF EXISTS "game icons admin delete" ON storage.objects;

CREATE POLICY "game icons read" ON storage.objects
  FOR SELECT USING (bucket_id = 'game-icons');
CREATE POLICY "game icons admin write" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'game-icons' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "game icons admin update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'game-icons' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "game icons admin delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'game-icons' AND public.has_role(auth.uid(), 'admin'));