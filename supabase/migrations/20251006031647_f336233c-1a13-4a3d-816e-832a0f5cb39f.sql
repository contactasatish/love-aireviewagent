-- Re-enable RLS on user_roles table
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- The policies should already exist from the previous migration, but let's ensure they're in place
-- These policies allow admins to manage all roles and users to view their own roles