GRANT SELECT ON public.games TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.games TO authenticated;
GRANT ALL ON public.games TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.game_versions TO authenticated;
GRANT ALL ON public.game_versions TO service_role;