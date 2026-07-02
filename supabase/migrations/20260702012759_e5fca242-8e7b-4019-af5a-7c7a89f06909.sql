
-- Grant admin to specific email owner
CREATE OR REPLACE FUNCTION public.grant_admin_for_verified_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email_confirmed_at IS NOT NULL
     AND lower(NEW.email) = 'mark114j@renoir.tyc.edu.tw' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_grant_mark_admin ON auth.users;
CREATE TRIGGER on_auth_user_created_grant_mark_admin
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.grant_admin_for_verified_email();

DROP TRIGGER IF EXISTS on_auth_user_confirmed_grant_mark_admin ON auth.users;
CREATE TRIGGER on_auth_user_confirmed_grant_mark_admin
AFTER UPDATE OF email_confirmed_at ON auth.users
FOR EACH ROW
WHEN (OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL)
EXECUTE FUNCTION public.grant_admin_for_verified_email();

-- Backfill in case the user already exists
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM auth.users
WHERE lower(email) = 'mark114j@renoir.tyc.edu.tw'
ON CONFLICT (user_id, role) DO NOTHING;

-- Add playable content columns to games
ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS html_content text,
  ADD COLUMN IF NOT EXISTS play_url text,
  ADD COLUMN IF NOT EXISTS cover_image_url text,
  ADD COLUMN IF NOT EXISTS instructions text;

-- Allow anyone to view published games publicly
DROP POLICY IF EXISTS "Public can view published games" ON public.games;
CREATE POLICY "Public can view published games"
ON public.games FOR SELECT
TO anon, authenticated
USING (status = 'published');

GRANT SELECT ON public.games TO anon;
