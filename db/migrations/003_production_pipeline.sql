-- Flow 8b: Production Pipeline database updates

BEGIN;

CREATE TABLE IF NOT EXISTS production_projects (
  id                  text PRIMARY KEY,
  title_id            text NOT NULL UNIQUE REFERENCES titles(id) ON DELETE CASCADE,
  status              text NOT NULL DEFAULT 'under_contract',
  
  -- DTP Stage
  dtp_assigned_to     text REFERENCES users(id) ON DELETE SET NULL,
  dtp_deadline        text,
  dtp_completed_at    text,
  
  -- Editing Stage
  editing_assigned_to text REFERENCES users(id) ON DELETE SET NULL,
  editing_deadline    text,
  editing_completed_at text,
  
  -- Cover Design Stage
  cover_assigned_to   text REFERENCES users(id) ON DELETE SET NULL,
  cover_deadline      text,
  cover_completed_at  text,
  
  -- ISBN Stage
  isbn_assigned_to    text REFERENCES users(id) ON DELETE SET NULL,
  isbn_deadline       text,
  isbn_completed_at   text,
  isbn_registered     text,
  
  -- Final Proof Stage
  proof_assigned_to   text REFERENCES users(id) ON DELETE SET NULL,
  proof_deadline      text,
  proof_completed_at  text,
  proof_feedback      text,
  proof_approved_at   text,
  
  -- Print Run Stage
  print_job_id        text REFERENCES print_jobs(id) ON DELETE SET NULL,
  print_completed_at  text,
  
  created_at          text NOT NULL,
  updated_at          text NOT NULL,
  
  CONSTRAINT production_status_valid CHECK (
    status = ANY (ARRAY['under_contract', 'dtp', 'editing', 'cover_design', 'isbn_registration', 'final_proof', 'printing', 'completed', 'cancelled'])
  )
);

COMMIT;
