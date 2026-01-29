-- Auth Hook Migration
-- Adds custom claims to JWT for role-based authorization
-- Created: 2026-01-29

-- Custom Access Token Hook
-- This function runs every time a JWT is generated
-- It adds the user's role to the JWT claims
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  claims JSONB;
  user_role TEXT;
BEGIN
  -- Get the user's role from user_roles table
  SELECT role INTO user_role
  FROM public.user_roles
  WHERE user_id = (event->>'user_id')::UUID
  LIMIT 1;

  -- Extract existing claims
  claims := event->'claims';

  -- Add user_role claim if role exists
  -- If no role found, user_role will be NULL (treated as unauthenticated for admin checks)
  IF user_role IS NOT NULL THEN
    claims := jsonb_set(claims, '{user_role}', to_jsonb(user_role));
  ELSE
    -- Explicitly set to null so the claim exists but is empty
    claims := jsonb_set(claims, '{user_role}', 'null'::jsonb);
  END IF;

  -- Return modified event with updated claims
  RETURN jsonb_set(event, '{claims}', claims);
END;
$$;

-- Grant execute permission to supabase_auth_admin
-- This is required for the Auth service to call the hook
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;

-- Revoke from public for security
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM PUBLIC;

-- Comment for documentation
COMMENT ON FUNCTION public.custom_access_token_hook IS
  'Auth Hook: Adds user_role claim to JWT. Register in Supabase Dashboard > Authentication > Hooks > Custom Access Token.';
