-- Temporarily disable RLS to allow bootstrapping the first admin
ALTER TABLE public.user_roles DISABLE ROW LEVEL SECURITY;

-- Note: After running this migration, you can manually insert the first admin via the cloud interface:
-- INSERT INTO public.user_roles (user_id, role) VALUES ('your-user-id-here', 'admin');

-- Then you can re-enable RLS by running:
-- ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;