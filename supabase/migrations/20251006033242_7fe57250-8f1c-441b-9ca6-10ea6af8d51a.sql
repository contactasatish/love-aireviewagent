-- Fix profiles table RLS policy to explicitly require authentication
-- This prevents unauthenticated users from accessing user email addresses and names

-- Drop the existing SELECT policy
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- Create a new SELECT policy that explicitly requires authentication
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Also update INSERT and UPDATE policies to be explicit about authentication
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can insert own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id);
