-- Migration 006: Add multiple assignee tracking columns to production_projects

BEGIN;

ALTER TABLE kairali_pms.production_projects ADD COLUMN IF NOT EXISTS dtp_assignees text;
ALTER TABLE kairali_pms.production_projects ADD COLUMN IF NOT EXISTS editing_assignees text;
ALTER TABLE kairali_pms.production_projects ADD COLUMN IF NOT EXISTS cover_assignees text;
ALTER TABLE kairali_pms.production_projects ADD COLUMN IF NOT EXISTS isbn_assignees text;
ALTER TABLE kairali_pms.production_projects ADD COLUMN IF NOT EXISTS proof_assignees text;

-- Also apply to public if present
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'production_projects') THEN
    ALTER TABLE public.production_projects ADD COLUMN IF NOT EXISTS dtp_assignees text;
    ALTER TABLE public.production_projects ADD COLUMN IF NOT EXISTS editing_assignees text;
    ALTER TABLE public.production_projects ADD COLUMN IF NOT EXISTS cover_assignees text;
    ALTER TABLE public.production_projects ADD COLUMN IF NOT EXISTS isbn_assignees text;
    ALTER TABLE public.production_projects ADD COLUMN IF NOT EXISTS proof_assignees text;
  END IF;
END $$;

COMMIT;
