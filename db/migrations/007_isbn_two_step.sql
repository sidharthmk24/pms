-- Migration 007: Add two-step ISBN registration tracking columns

BEGIN;

ALTER TABLE kairali_pms.production_projects ADD COLUMN IF NOT EXISTS isbn_requested_at text;
ALTER TABLE kairali_pms.production_projects ADD COLUMN IF NOT EXISTS isbn_request_ref text;

-- Also apply to public if present
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'production_projects') THEN
    ALTER TABLE public.production_projects ADD COLUMN IF NOT EXISTS isbn_requested_at text;
    ALTER TABLE public.production_projects ADD COLUMN IF NOT EXISTS isbn_request_ref text;
  END IF;
END $$;

COMMIT;
