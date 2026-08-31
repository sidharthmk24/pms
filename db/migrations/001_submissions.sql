-- Flow 7: public "Publish With Us" manuscript submissions.
-- Submissions are deliberately NOT rows in `authors`: an aspiring author only
-- becomes an author on acceptance (Flow 8a).

BEGIN;

CREATE TABLE IF NOT EXISTS submissions (
  id                   text PRIMARY KEY,
  ref_no               text NOT NULL,
  -- author info
  author_name          text NOT NULL,
  author_name_ml       text,
  email                text NOT NULL,
  phone                text,
  place                text,
  -- manuscript
  title                text NOT NULL,
  title_ml             text,
  genre                text NOT NULL,
  language             text NOT NULL DEFAULT 'Malayalam',
  synopsis             text NOT NULL,
  manuscript_path      text,
  manuscript_filename  text,
  manuscript_size      integer,
  manuscript_mime      text,
  -- pipeline
  status               text NOT NULL DEFAULT 'new',
  source               text NOT NULL DEFAULT 'web',
  reviewed_by          text,
  review_notes         text,
  decided_on           text,
  submitted_at         text NOT NULL DEFAULT to_char((now() AT TIME ZONE 'utc'), 'YYYY-MM-DD HH24:MI:SS'),
  updated_at           text NOT NULL DEFAULT to_char((now() AT TIME ZONE 'utc'), 'YYYY-MM-DD HH24:MI:SS'),

  CONSTRAINT submissions_ref_no_unique UNIQUE (ref_no),
  CONSTRAINT submissions_reviewed_by_users_id_fk
    FOREIGN KEY (reviewed_by) REFERENCES users(id),
  -- Values beyond 'new' are consumed by the internal pipeline (Flow 8a).
  CONSTRAINT submissions_status_valid CHECK (
    status = ANY (ARRAY['new','under_review','shortlisted','accepted','rejected','withdrawn'])
  ),
  CONSTRAINT submissions_source_valid CHECK (
    source = ANY (ARRAY['web','email','post','walk_in'])
  ),
  CONSTRAINT submissions_size_non_negative CHECK (
    manuscript_size IS NULL OR manuscript_size >= 0
  )
);

CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions (status);
CREATE INDEX IF NOT EXISTS idx_submissions_at ON submissions (submitted_at);
CREATE INDEX IF NOT EXISTS idx_submissions_email ON submissions (email);
CREATE INDEX IF NOT EXISTS idx_submissions_reviewed_by ON submissions (reviewed_by);

-- Outbound mail is queued, never sent inline: a mail outage must not cost us a
-- manuscript. A worker/provider drains this later.
CREATE TABLE IF NOT EXISTS email_outbox (
  id          text PRIMARY KEY,
  to_email    text NOT NULL,
  to_name     text,
  subject     text NOT NULL,
  body_text   text NOT NULL,
  body_html   text,
  template    text,
  ref_type    text,
  ref_id      text,
  status      text NOT NULL DEFAULT 'pending',
  attempts    integer NOT NULL DEFAULT 0,
  last_error  text,
  created_at  text NOT NULL DEFAULT to_char((now() AT TIME ZONE 'utc'), 'YYYY-MM-DD HH24:MI:SS'),
  sent_at     text,

  CONSTRAINT email_outbox_status_valid CHECK (
    status = ANY (ARRAY['pending','sent','failed'])
  ),
  CONSTRAINT email_outbox_attempts_non_negative CHECK (attempts >= 0)
);

CREATE INDEX IF NOT EXISTS idx_outbox_status ON email_outbox (status, created_at);

-- Per-IP throttle for the public form. IPs are stored hashed, never in clear.
CREATE TABLE IF NOT EXISTS submission_throttle (
  ip_hash     text PRIMARY KEY,
  count       integer NOT NULL DEFAULT 0,
  window_start text NOT NULL DEFAULT to_char((now() AT TIME ZONE 'utc'), 'YYYY-MM-DD HH24:MI:SS'),
  last_at     text NOT NULL DEFAULT to_char((now() AT TIME ZONE 'utc'), 'YYYY-MM-DD HH24:MI:SS'),

  CONSTRAINT submission_throttle_count_non_negative CHECK (count >= 0)
);

-- Reference-number counter, matching the existing invoice:/print_job: pattern.
INSERT INTO counters (name, value) VALUES ('submission:2026', 0)
  ON CONFLICT (name) DO NOTHING;

-- Editable copy so the form, the confirmation screen and the email agree.
INSERT INTO settings (key, value) VALUES
  ('submissions.response_weeks', '8'),
  ('submissions.open', 'true')
  ON CONFLICT (key) DO NOTHING;

COMMIT;
