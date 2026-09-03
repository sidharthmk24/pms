-- Flow 8b: Post-Production & Warehouse Intake Pipeline updates
-- Follows Flow 8b sitemap diagram: QC inspection, author copies segregation (Kairali Books Publishing vs Self-Publishing),
-- warehouse inward stock movement, multi-channel distribution activation (retail, dealer, fair, online), and PMS-to-BMS sales handover.

BEGIN;

ALTER TABLE kairali_pms.production_projects ADD COLUMN IF NOT EXISTS qc_passed_at text;
ALTER TABLE kairali_pms.production_projects ADD COLUMN IF NOT EXISTS qc_notes text;
ALTER TABLE kairali_pms.production_projects ADD COLUMN IF NOT EXISTS damaged_qty integer DEFAULT 0;
ALTER TABLE kairali_pms.production_projects ADD COLUMN IF NOT EXISTS author_copies_qty integer DEFAULT 0;
ALTER TABLE kairali_pms.production_projects ADD COLUMN IF NOT EXISTS author_copies_dispatched_at text;
ALTER TABLE kairali_pms.production_projects ADD COLUMN IF NOT EXISTS author_dispatch_tracking text;
ALTER TABLE kairali_pms.production_projects ADD COLUMN IF NOT EXISTS warehouse_received_qty integer DEFAULT 0;
ALTER TABLE kairali_pms.production_projects ADD COLUMN IF NOT EXISTS channels_activated text DEFAULT 'retail,dealer,fair,online';
ALTER TABLE kairali_pms.production_projects ADD COLUMN IF NOT EXISTS handover_completed_at text;

COMMIT;
