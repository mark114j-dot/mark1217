-- Repair creator publish permissions without reopening public access.
-- The publish RPC is intentionally available only to authenticated/service-role callers.

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_player_game(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_player_game(text, text) TO service_role;

-- Keep the function protected from anonymous callers.
REVOKE EXECUTE ON FUNCTION public.create_player_game(text, text) FROM anon;

-- Ensure the function can safely perform its own insert even though games is RLS-protected.
ALTER FUNCTION public.create_player_game(text, text)
  SECURITY DEFINER
  SET search_path = public, pg_temp;
