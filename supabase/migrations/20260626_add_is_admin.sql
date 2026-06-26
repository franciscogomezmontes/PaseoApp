-- Migration: add is_admin flag to personas and RLS policies for admin-only inserts
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor > New query)

-- 1. Add is_admin column (idempotent)
ALTER TABLE public.personas
  ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

-- 2. Grant the admin flag to the current admin user.
--    Replace the email below with the actual admin account email.
--    Run only once; re-running is safe (idempotent UPDATE).
UPDATE public.personas
  SET is_admin = true
  WHERE email = 'YOUR_ADMIN_EMAIL_HERE';

-- 3. RLS policy: only admins can bulk-insert recetas
--    Drop first to allow re-running this script safely.
DROP POLICY IF EXISTS "admins_can_insert_recetas" ON public.recetas;
CREATE POLICY "admins_can_insert_recetas" ON public.recetas
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.personas
      WHERE auth_user_id = auth.uid()
        AND is_admin = true
    )
  );

-- 4. RLS policy: only admins can bulk-insert ingredientes
DROP POLICY IF EXISTS "admins_can_insert_ingredientes" ON public.ingredientes;
CREATE POLICY "admins_can_insert_ingredientes" ON public.ingredientes
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.personas
      WHERE auth_user_id = auth.uid()
        AND is_admin = true
    )
  );
