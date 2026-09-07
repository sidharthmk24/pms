-- Migration 008: Add post_production status and proof approval tracking columns

BEGIN;

-- 1. Update status check constraint to include 'post_production'
ALTER TABLE kairali_pms.production_projects DROP CONSTRAINT IF EXISTS production_status_valid;
ALTER TABLE kairali_pms.production_projects ADD CONSTRAINT production_status_valid 
  CHECK (status = ANY (ARRAY[
    'under_contract'::text, 
    'dtp'::text, 
    'editing'::text, 
    'cover_design'::text, 
    'isbn_registration'::text, 
    'final_proof'::text, 
    'printing'::text, 
    'post_production'::text, 
    'completed'::text, 
    'cancelled'::text
  ]));

-- 2. Add proof approval token and email tracking columns
ALTER TABLE kairali_pms.production_projects ADD COLUMN IF NOT EXISTS proof_token text;
ALTER TABLE kairali_pms.production_projects ADD COLUMN IF NOT EXISTS proof_email_sent_at text;
ALTER TABLE kairali_pms.production_projects ADD COLUMN IF NOT EXISTS post_production_completed_at text;

-- 3. Also apply to public schema if present
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'production_projects') THEN
    ALTER TABLE public.production_projects DROP CONSTRAINT IF EXISTS production_status_valid;
    ALTER TABLE public.production_projects ADD CONSTRAINT production_status_valid 
      CHECK (status = ANY (ARRAY[
        'under_contract'::text, 
        'dtp'::text, 
        'editing'::text, 
        'cover_design'::text, 
        'isbn_registration'::text, 
        'final_proof'::text, 
        'printing'::text, 
        'post_production'::text, 
        'completed'::text, 
        'cancelled'::text
      ]));
    ALTER TABLE public.production_projects ADD COLUMN IF NOT EXISTS proof_token text;
    ALTER TABLE public.production_projects ADD COLUMN IF NOT EXISTS proof_email_sent_at text;
    ALTER TABLE public.production_projects ADD COLUMN IF NOT EXISTS post_production_completed_at text;
  END IF;
END $$;

COMMIT;
