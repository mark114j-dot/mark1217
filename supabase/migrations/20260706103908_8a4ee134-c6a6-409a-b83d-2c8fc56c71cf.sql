GRANT SELECT ON public.announcements TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.announcements TO authenticated;
GRANT ALL ON public.announcements TO service_role;

GRANT SELECT ON public.shop_emotes TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.shop_emotes TO authenticated;
GRANT ALL ON public.shop_emotes TO service_role;

GRANT SELECT, INSERT, DELETE ON public.owned_emotes TO authenticated;
GRANT ALL ON public.owned_emotes TO service_role;

GRANT SELECT, INSERT ON public.emote_broadcasts TO authenticated;
GRANT ALL ON public.emote_broadcasts TO service_role;

GRANT SELECT, INSERT ON public.invite_claims TO authenticated;
GRANT ALL ON public.invite_claims TO service_role;

DROP POLICY IF EXISTS "emotes public read" ON storage.objects;
DROP POLICY IF EXISTS "emotes admin write" ON storage.objects;
DROP POLICY IF EXISTS "emotes admin update" ON storage.objects;
DROP POLICY IF EXISTS "emotes admin delete" ON storage.objects;

CREATE POLICY "emotes public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'emotes');
CREATE POLICY "emotes admin write" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'emotes' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "emotes admin update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'emotes' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "emotes admin delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'emotes' AND public.has_role(auth.uid(), 'admin'));