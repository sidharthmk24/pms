-- Flow 8a: Pre-Approval workflow schema changes

BEGIN;

-- 1. Modify the submissions status constraint to allow needs_revision, declined, and archived.
ALTER TABLE submissions DROP CONSTRAINT IF EXISTS submissions_status_valid;

ALTER TABLE submissions ADD CONSTRAINT submissions_status_valid CHECK (
  status = ANY (ARRAY['new', 'pending_review', 'under_review', 'needs_revision', 'accepted', 'declined', 'archived', 'withdrawn'])
);

-- 2. Add columns for storing publishing type and assignment dates.
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS publishing_type text;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS assigned_at text;

-- Add check constraint for publishing type to ensure consistency.
ALTER TABLE submissions DROP CONSTRAINT IF EXISTS submissions_publishing_type_valid;
ALTER TABLE submissions ADD CONSTRAINT submissions_publishing_type_valid CHECK (
  publishing_type IS NULL OR publishing_type = ANY (ARRAY['kairali_funded', 'self_publishing'])
);

COMMIT;
