-- Flow 8b: Production files tracking columns

BEGIN;

ALTER TABLE production_projects ADD COLUMN IF NOT EXISTS final_layout_path text;
ALTER TABLE production_projects ADD COLUMN IF NOT EXISTS final_cover_path text;

COMMIT;
