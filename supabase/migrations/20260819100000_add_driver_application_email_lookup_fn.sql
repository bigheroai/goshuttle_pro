-- Migration: Add SECURITY DEFINER function for driver application email lookup
-- This allows unauthenticated drivers to check their application status by email
-- without needing SELECT RLS access on driver_applications.

CREATE OR REPLACE FUNCTION public.lookup_driver_application_by_email(lookup_email TEXT)
RETURNS SETOF public.driver_applications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM public.driver_applications
  WHERE LOWER(TRIM(email)) = LOWER(TRIM(lookup_email))
  ORDER BY created_at DESC
  LIMIT 1;
END;
$$;

-- Grant execute to anon and authenticated roles
GRANT EXECUTE ON FUNCTION public.lookup_driver_application_by_email(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.lookup_driver_application_by_email(TEXT) TO authenticated;
