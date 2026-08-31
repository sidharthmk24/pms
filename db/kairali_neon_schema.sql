--
-- PostgreSQL database dump
--

\restrict JHiDkl9sFDT0YVTshOjRsFF21fTek3EKfIMznpYmIrBUAcMWTJ2S5aTUI3B9d8K

-- Dumped from database version 17.6 (Homebrew)
-- Dumped by pg_dump version 17.6 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: drizzle; Type: SCHEMA; Schema: -; Owner: mm-developer01
--

CREATE SCHEMA drizzle;


ALTER SCHEMA drizzle OWNER TO neondb_owner;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: __drizzle_migrations; Type: TABLE; Schema: drizzle; Owner: mm-developer01
--

CREATE TABLE drizzle.__drizzle_migrations (
    id integer NOT NULL,
    hash text NOT NULL,
    created_at bigint
);


ALTER TABLE drizzle.__drizzle_migrations OWNER TO neondb_owner;

--
-- Name: __drizzle_migrations_id_seq; Type: SEQUENCE; Schema: drizzle; Owner: mm-developer01
--

CREATE SEQUENCE drizzle.__drizzle_migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE drizzle.__drizzle_migrations_id_seq OWNER TO neondb_owner;

--
-- Name: __drizzle_migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: drizzle; Owner: mm-developer01
--

ALTER SEQUENCE drizzle.__drizzle_migrations_id_seq OWNED BY drizzle.__drizzle_migrations.id;


--
-- Name: audit_log; Type: TABLE; Schema: kairali_pms; Owner: mm-developer01
--

CREATE TABLE kairali_pms.audit_log (
    id text NOT NULL,
    user_id text,
    action text NOT NULL,
    entity text NOT NULL,
    entity_id text,
    detail text,
    at text DEFAULT to_char((now() AT TIME ZONE 'utc'::text), 'YYYY-MM-DD HH24:MI:SS'::text) NOT NULL
);


ALTER TABLE kairali_pms.audit_log OWNER TO neondb_owner;

--
-- Name: authors; Type: TABLE; Schema: kairali_pms; Owner: mm-developer01
--

CREATE TABLE kairali_pms.authors (
    id text NOT NULL,
    name text NOT NULL,
    name_ml text,
    phone text,
    email text,
    address text,
    pan text,
    notes text,
    created_at text DEFAULT to_char((now() AT TIME ZONE 'utc'::text), 'YYYY-MM-DD HH24:MI:SS'::text) NOT NULL
);


ALTER TABLE kairali_pms.authors OWNER TO neondb_owner;

--
-- Name: contracts; Type: TABLE; Schema: kairali_pms; Owner: mm-developer01
--

CREATE TABLE kairali_pms.contracts (
    id text NOT NULL,
    title_id text NOT NULL,
    author_id text NOT NULL,
    royalty_pct real DEFAULT 10 NOT NULL,
    basis text DEFAULT 'mrp'::text NOT NULL,
    advance_paise integer DEFAULT 0 NOT NULL,
    signed_on text,
    term_notes text,
    created_at text DEFAULT to_char((now() AT TIME ZONE 'utc'::text), 'YYYY-MM-DD HH24:MI:SS'::text) NOT NULL,
    CONSTRAINT contracts_advance_non_negative CHECK ((advance_paise >= 0)),
    CONSTRAINT contracts_basis_valid CHECK ((basis = ANY (ARRAY['mrp'::text, 'net'::text]))),
    CONSTRAINT contracts_royalty_pct_range CHECK (((royalty_pct >= (0)::double precision) AND (royalty_pct <= (100)::double precision)))
);


ALTER TABLE kairali_pms.contracts OWNER TO neondb_owner;

--
-- Name: counters; Type: TABLE; Schema: kairali_pms; Owner: mm-developer01
--

CREATE TABLE kairali_pms.counters (
    name text NOT NULL,
    value integer DEFAULT 0 NOT NULL
);


ALTER TABLE kairali_pms.counters OWNER TO neondb_owner;

--
-- Name: dealers; Type: TABLE; Schema: kairali_pms; Owner: mm-developer01
--

CREATE TABLE kairali_pms.dealers (
    id text NOT NULL,
    name text NOT NULL,
    contact text,
    phone text,
    gstin text,
    address text,
    discount_pct real DEFAULT 30 NOT NULL,
    credit_limit_paise integer DEFAULT 0 NOT NULL,
    created_at text DEFAULT to_char((now() AT TIME ZONE 'utc'::text), 'YYYY-MM-DD HH24:MI:SS'::text) NOT NULL,
    CONSTRAINT dealers_discount_pct_range CHECK (((discount_pct >= (0)::double precision) AND (discount_pct <= (100)::double precision)))
);


ALTER TABLE kairali_pms.dealers OWNER TO neondb_owner;

--
-- Name: email_outbox; Type: TABLE; Schema: kairali_pms; Owner: mm-developer01
--

CREATE TABLE kairali_pms.email_outbox (
    id text NOT NULL,
    to_email text NOT NULL,
    to_name text,
    subject text NOT NULL,
    body_text text NOT NULL,
    body_html text,
    template text,
    ref_type text,
    ref_id text,
    status text DEFAULT 'pending'::text NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    last_error text,
    created_at text DEFAULT to_char((now() AT TIME ZONE 'utc'::text), 'YYYY-MM-DD HH24:MI:SS'::text) NOT NULL,
    sent_at text,
    CONSTRAINT email_outbox_attempts_non_negative CHECK ((attempts >= 0)),
    CONSTRAINT email_outbox_status_valid CHECK ((status = ANY (ARRAY['pending'::text, 'sent'::text, 'failed'::text])))
);


ALTER TABLE kairali_pms.email_outbox OWNER TO neondb_owner;

--
-- Name: login_attempts; Type: TABLE; Schema: kairali_pms; Owner: mm-developer01
--

CREATE TABLE kairali_pms.login_attempts (
    email text NOT NULL,
    failed_count integer DEFAULT 0 NOT NULL,
    first_failed_at text DEFAULT to_char((now() AT TIME ZONE 'utc'::text), 'YYYY-MM-DD HH24:MI:SS'::text) NOT NULL,
    last_failed_at text DEFAULT to_char((now() AT TIME ZONE 'utc'::text), 'YYYY-MM-DD HH24:MI:SS'::text) NOT NULL,
    locked_until text
);


ALTER TABLE kairali_pms.login_attempts OWNER TO neondb_owner;

--
-- Name: payouts; Type: TABLE; Schema: kairali_pms; Owner: mm-developer01
--

CREATE TABLE kairali_pms.payouts (
    id text NOT NULL,
    author_id text NOT NULL,
    gross_paise integer NOT NULL,
    tds_paise integer DEFAULT 0 NOT NULL,
    net_paise integer NOT NULL,
    paid_on text DEFAULT to_char((now() AT TIME ZONE 'utc'::text), 'YYYY-MM-DD'::text) NOT NULL,
    method text,
    reference text,
    note text,
    created_by text,
    created_at text DEFAULT to_char((now() AT TIME ZONE 'utc'::text), 'YYYY-MM-DD HH24:MI:SS'::text) NOT NULL,
    CONSTRAINT payouts_gross_non_negative CHECK ((gross_paise >= 0)),
    CONSTRAINT payouts_tds_non_negative CHECK ((tds_paise >= 0))
);


ALTER TABLE kairali_pms.payouts OWNER TO neondb_owner;

--
-- Name: print_jobs; Type: TABLE; Schema: kairali_pms; Owner: mm-developer01
--

CREATE TABLE kairali_pms.print_jobs (
    id text NOT NULL,
    job_no text NOT NULL,
    title_id text NOT NULL,
    qty integer NOT NULL,
    paper text,
    binding text,
    vendor text,
    cost_paise integer DEFAULT 0 NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    raised_on text DEFAULT to_char((now() AT TIME ZONE 'utc'::text), 'YYYY-MM-DD'::text) NOT NULL,
    received_on text,
    notes text,
    created_by text,
    created_at text DEFAULT to_char((now() AT TIME ZONE 'utc'::text), 'YYYY-MM-DD HH24:MI:SS'::text) NOT NULL,
    CONSTRAINT print_jobs_cost_non_negative CHECK ((cost_paise >= 0)),
    CONSTRAINT print_jobs_qty_positive CHECK ((qty > 0)),
    CONSTRAINT print_jobs_status_valid CHECK ((status = ANY (ARRAY['pending'::text, 'printing'::text, 'completed'::text, 'cancelled'::text])))
);


ALTER TABLE kairali_pms.print_jobs OWNER TO neondb_owner;

--
-- Name: production_projects; Type: TABLE; Schema: kairali_pms; Owner: mm-developer01
--

CREATE TABLE kairali_pms.production_projects (
    id text NOT NULL,
    title_id text NOT NULL,
    status text DEFAULT 'under_contract'::text NOT NULL,
    dtp_assigned_to text,
    dtp_deadline text,
    dtp_completed_at text,
    editing_assigned_to text,
    editing_deadline text,
    editing_completed_at text,
    cover_assigned_to text,
    cover_deadline text,
    cover_completed_at text,
    isbn_assigned_to text,
    isbn_deadline text,
    isbn_completed_at text,
    isbn_registered text,
    proof_assigned_to text,
    proof_deadline text,
    proof_completed_at text,
    proof_feedback text,
    proof_approved_at text,
    print_job_id text,
    print_completed_at text,
    created_at text NOT NULL,
    updated_at text NOT NULL,
    final_layout_path text,
    final_cover_path text,
    CONSTRAINT production_status_valid CHECK ((status = ANY (ARRAY['under_contract'::text, 'dtp'::text, 'editing'::text, 'cover_design'::text, 'isbn_registration'::text, 'final_proof'::text, 'printing'::text, 'completed'::text, 'cancelled'::text])))
);


ALTER TABLE kairali_pms.production_projects OWNER TO neondb_owner;

--
-- Name: sale_lines; Type: TABLE; Schema: kairali_pms; Owner: mm-developer01
--

CREATE TABLE kairali_pms.sale_lines (
    id text NOT NULL,
    sale_id text NOT NULL,
    title_id text NOT NULL,
    qty integer NOT NULL,
    unit_price_paise integer NOT NULL,
    discount_pct real DEFAULT 0 NOT NULL,
    line_total_paise integer NOT NULL,
    CONSTRAINT sale_lines_qty_positive CHECK ((qty > 0)),
    CONSTRAINT sale_lines_unit_price_non_negative CHECK ((unit_price_paise >= 0))
);


ALTER TABLE kairali_pms.sale_lines OWNER TO neondb_owner;

--
-- Name: sales; Type: TABLE; Schema: kairali_pms; Owner: mm-developer01
--

CREATE TABLE kairali_pms.sales (
    id text NOT NULL,
    doc_no text NOT NULL,
    type text DEFAULT 'sale'::text NOT NULL,
    channel text NOT NULL,
    dealer_id text,
    customer_name text NOT NULL,
    event_name text,
    discount_pct real DEFAULT 0 NOT NULL,
    subtotal_paise integer DEFAULT 0 NOT NULL,
    discount_paise integer DEFAULT 0 NOT NULL,
    total_paise integer DEFAULT 0 NOT NULL,
    payment_mode text,
    sold_on text DEFAULT to_char((now() AT TIME ZONE 'utc'::text), 'YYYY-MM-DD'::text) NOT NULL,
    return_of_sale_id text,
    notes text,
    created_by text,
    created_at text DEFAULT to_char((now() AT TIME ZONE 'utc'::text), 'YYYY-MM-DD HH24:MI:SS'::text) NOT NULL,
    CONSTRAINT sales_channel_valid CHECK ((channel = ANY (ARRAY['retail'::text, 'dealer'::text, 'fair'::text, 'online'::text]))),
    CONSTRAINT sales_discount_pct_range CHECK (((discount_pct >= (0)::double precision) AND (discount_pct <= (100)::double precision))),
    CONSTRAINT sales_type_valid CHECK ((type = ANY (ARRAY['sale'::text, 'return'::text])))
);


ALTER TABLE kairali_pms.sales OWNER TO neondb_owner;

--
-- Name: sessions; Type: TABLE; Schema: kairali_pms; Owner: mm-developer01
--

CREATE TABLE kairali_pms.sessions (
    id text NOT NULL,
    user_id text NOT NULL,
    token_hash text NOT NULL,
    expires_at text NOT NULL,
    created_at text DEFAULT to_char((now() AT TIME ZONE 'utc'::text), 'YYYY-MM-DD HH24:MI:SS'::text) NOT NULL,
    last_seen_at text DEFAULT to_char((now() AT TIME ZONE 'utc'::text), 'YYYY-MM-DD HH24:MI:SS'::text) NOT NULL
);


ALTER TABLE kairali_pms.sessions OWNER TO neondb_owner;

--
-- Name: settings; Type: TABLE; Schema: kairali_pms; Owner: mm-developer01
--

CREATE TABLE kairali_pms.settings (
    key text NOT NULL,
    value text NOT NULL,
    updated_at text DEFAULT to_char((now() AT TIME ZONE 'utc'::text), 'YYYY-MM-DD HH24:MI:SS'::text) NOT NULL,
    updated_by text
);


ALTER TABLE kairali_pms.settings OWNER TO neondb_owner;

--
-- Name: stock_movements; Type: TABLE; Schema: kairali_pms; Owner: mm-developer01
--

CREATE TABLE kairali_pms.stock_movements (
    id text NOT NULL,
    title_id text NOT NULL,
    qty_delta integer NOT NULL,
    reason text NOT NULL,
    ref_type text,
    ref_id text,
    balance_after integer NOT NULL,
    note text,
    user_id text,
    at text DEFAULT to_char((now() AT TIME ZONE 'utc'::text), 'YYYY-MM-DD HH24:MI:SS'::text) NOT NULL,
    CONSTRAINT stock_movements_reason_valid CHECK ((reason = ANY (ARRAY['print_receipt'::text, 'sale'::text, 'return'::text, 'adjustment'::text, 'damage'::text, 'opening'::text, 'fair_out'::text, 'fair_in'::text])))
);


ALTER TABLE kairali_pms.stock_movements OWNER TO neondb_owner;

--
-- Name: submission_throttle; Type: TABLE; Schema: kairali_pms; Owner: mm-developer01
--

CREATE TABLE kairali_pms.submission_throttle (
    ip_hash text NOT NULL,
    count integer DEFAULT 0 NOT NULL,
    window_start text DEFAULT to_char((now() AT TIME ZONE 'utc'::text), 'YYYY-MM-DD HH24:MI:SS'::text) NOT NULL,
    last_at text DEFAULT to_char((now() AT TIME ZONE 'utc'::text), 'YYYY-MM-DD HH24:MI:SS'::text) NOT NULL,
    CONSTRAINT submission_throttle_count_non_negative CHECK ((count >= 0))
);


ALTER TABLE kairali_pms.submission_throttle OWNER TO neondb_owner;

--
-- Name: submissions; Type: TABLE; Schema: kairali_pms; Owner: mm-developer01
--

CREATE TABLE kairali_pms.submissions (
    id text NOT NULL,
    ref_no text NOT NULL,
    author_name text NOT NULL,
    author_name_ml text,
    email text NOT NULL,
    phone text,
    place text,
    title text NOT NULL,
    title_ml text,
    genre text NOT NULL,
    language text DEFAULT 'Malayalam'::text NOT NULL,
    synopsis text NOT NULL,
    manuscript_path text,
    manuscript_filename text,
    manuscript_size integer,
    manuscript_mime text,
    status text DEFAULT 'new'::text NOT NULL,
    source text DEFAULT 'web'::text NOT NULL,
    reviewed_by text,
    review_notes text,
    decided_on text,
    submitted_at text DEFAULT to_char((now() AT TIME ZONE 'utc'::text), 'YYYY-MM-DD HH24:MI:SS'::text) NOT NULL,
    updated_at text DEFAULT to_char((now() AT TIME ZONE 'utc'::text), 'YYYY-MM-DD HH24:MI:SS'::text) NOT NULL,
    publishing_type text,
    assigned_at text,
    CONSTRAINT submissions_publishing_type_valid CHECK (((publishing_type IS NULL) OR (publishing_type = ANY (ARRAY['kairali_funded'::text, 'self_publishing'::text])))),
    CONSTRAINT submissions_size_non_negative CHECK (((manuscript_size IS NULL) OR (manuscript_size >= 0))),
    CONSTRAINT submissions_source_valid CHECK ((source = ANY (ARRAY['web'::text, 'email'::text, 'post'::text, 'walk_in'::text]))),
    CONSTRAINT submissions_status_valid CHECK ((status = ANY (ARRAY['new'::text, 'pending_review'::text, 'under_review'::text, 'needs_revision'::text, 'accepted'::text, 'declined'::text, 'archived'::text, 'withdrawn'::text])))
);


ALTER TABLE kairali_pms.submissions OWNER TO neondb_owner;

--
-- Name: titles; Type: TABLE; Schema: kairali_pms; Owner: mm-developer01
--

CREATE TABLE kairali_pms.titles (
    id text NOT NULL,
    isbn text,
    name text NOT NULL,
    name_ml text,
    author_id text,
    category text,
    language text DEFAULT 'Malayalam'::text NOT NULL,
    edition text DEFAULT '1st'::text NOT NULL,
    edition_no integer DEFAULT 1 NOT NULL,
    parent_title_id text,
    mrp_paise integer DEFAULT 0 NOT NULL,
    unit_cost_paise integer DEFAULT 0 NOT NULL,
    pages integer,
    binding text,
    reorder_level integer DEFAULT 30 NOT NULL,
    stock integer DEFAULT 0 NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    created_at text DEFAULT to_char((now() AT TIME ZONE 'utc'::text), 'YYYY-MM-DD HH24:MI:SS'::text) NOT NULL,
    CONSTRAINT titles_mrp_non_negative CHECK ((mrp_paise >= 0)),
    CONSTRAINT titles_reorder_level_non_negative CHECK ((reorder_level >= 0)),
    CONSTRAINT titles_status_valid CHECK ((status = ANY (ARRAY['active'::text, 'out_of_print'::text]))),
    CONSTRAINT titles_unit_cost_non_negative CHECK ((unit_cost_paise >= 0))
);


ALTER TABLE kairali_pms.titles OWNER TO neondb_owner;

--
-- Name: users; Type: TABLE; Schema: kairali_pms; Owner: mm-developer01
--

CREATE TABLE kairali_pms.users (
    id text NOT NULL,
    email text NOT NULL,
    name text NOT NULL,
    password_hash text NOT NULL,
    role text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at text DEFAULT to_char((now() AT TIME ZONE 'utc'::text), 'YYYY-MM-DD HH24:MI:SS'::text) NOT NULL,
    CONSTRAINT users_role_valid CHECK ((role = ANY (ARRAY['owner'::text, 'editor'::text, 'production'::text, 'accounts'::text, 'store'::text])))
);


ALTER TABLE kairali_pms.users OWNER TO neondb_owner;

--
-- Name: __drizzle_migrations id; Type: DEFAULT; Schema: drizzle; Owner: mm-developer01
--

ALTER TABLE ONLY drizzle.__drizzle_migrations ALTER COLUMN id SET DEFAULT nextval('drizzle.__drizzle_migrations_id_seq'::regclass);


--
-- Name: __drizzle_migrations __drizzle_migrations_pkey; Type: CONSTRAINT; Schema: drizzle; Owner: mm-developer01
--

ALTER TABLE ONLY drizzle.__drizzle_migrations
    ADD CONSTRAINT __drizzle_migrations_pkey PRIMARY KEY (id);


--
-- Name: audit_log audit_log_pkey; Type: CONSTRAINT; Schema: kairali_pms; Owner: mm-developer01
--

ALTER TABLE ONLY kairali_pms.audit_log
    ADD CONSTRAINT audit_log_pkey PRIMARY KEY (id);


--
-- Name: authors authors_pkey; Type: CONSTRAINT; Schema: kairali_pms; Owner: mm-developer01
--

ALTER TABLE ONLY kairali_pms.authors
    ADD CONSTRAINT authors_pkey PRIMARY KEY (id);


--
-- Name: contracts contracts_pkey; Type: CONSTRAINT; Schema: kairali_pms; Owner: mm-developer01
--

ALTER TABLE ONLY kairali_pms.contracts
    ADD CONSTRAINT contracts_pkey PRIMARY KEY (id);


--
-- Name: contracts contracts_title_id_unique; Type: CONSTRAINT; Schema: kairali_pms; Owner: mm-developer01
--

ALTER TABLE ONLY kairali_pms.contracts
    ADD CONSTRAINT contracts_title_id_unique UNIQUE (title_id);


--
-- Name: counters counters_pkey; Type: CONSTRAINT; Schema: kairali_pms; Owner: mm-developer01
--

ALTER TABLE ONLY kairali_pms.counters
    ADD CONSTRAINT counters_pkey PRIMARY KEY (name);


--
-- Name: dealers dealers_pkey; Type: CONSTRAINT; Schema: kairali_pms; Owner: mm-developer01
--

ALTER TABLE ONLY kairali_pms.dealers
    ADD CONSTRAINT dealers_pkey PRIMARY KEY (id);


--
-- Name: email_outbox email_outbox_pkey; Type: CONSTRAINT; Schema: kairali_pms; Owner: mm-developer01
--

ALTER TABLE ONLY kairali_pms.email_outbox
    ADD CONSTRAINT email_outbox_pkey PRIMARY KEY (id);


--
-- Name: login_attempts login_attempts_pkey; Type: CONSTRAINT; Schema: kairali_pms; Owner: mm-developer01
--

ALTER TABLE ONLY kairali_pms.login_attempts
    ADD CONSTRAINT login_attempts_pkey PRIMARY KEY (email);


--
-- Name: payouts payouts_pkey; Type: CONSTRAINT; Schema: kairali_pms; Owner: mm-developer01
--

ALTER TABLE ONLY kairali_pms.payouts
    ADD CONSTRAINT payouts_pkey PRIMARY KEY (id);


--
-- Name: print_jobs print_jobs_job_no_unique; Type: CONSTRAINT; Schema: kairali_pms; Owner: mm-developer01
--

ALTER TABLE ONLY kairali_pms.print_jobs
    ADD CONSTRAINT print_jobs_job_no_unique UNIQUE (job_no);


--
-- Name: print_jobs print_jobs_pkey; Type: CONSTRAINT; Schema: kairali_pms; Owner: mm-developer01
--

ALTER TABLE ONLY kairali_pms.print_jobs
    ADD CONSTRAINT print_jobs_pkey PRIMARY KEY (id);


--
-- Name: production_projects production_projects_pkey; Type: CONSTRAINT; Schema: kairali_pms; Owner: mm-developer01
--

ALTER TABLE ONLY kairali_pms.production_projects
    ADD CONSTRAINT production_projects_pkey PRIMARY KEY (id);


--
-- Name: production_projects production_projects_title_id_key; Type: CONSTRAINT; Schema: kairali_pms; Owner: mm-developer01
--

ALTER TABLE ONLY kairali_pms.production_projects
    ADD CONSTRAINT production_projects_title_id_key UNIQUE (title_id);


--
-- Name: sale_lines sale_lines_pkey; Type: CONSTRAINT; Schema: kairali_pms; Owner: mm-developer01
--

ALTER TABLE ONLY kairali_pms.sale_lines
    ADD CONSTRAINT sale_lines_pkey PRIMARY KEY (id);


--
-- Name: sales sales_doc_no_unique; Type: CONSTRAINT; Schema: kairali_pms; Owner: mm-developer01
--

ALTER TABLE ONLY kairali_pms.sales
    ADD CONSTRAINT sales_doc_no_unique UNIQUE (doc_no);


--
-- Name: sales sales_pkey; Type: CONSTRAINT; Schema: kairali_pms; Owner: mm-developer01
--

ALTER TABLE ONLY kairali_pms.sales
    ADD CONSTRAINT sales_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: kairali_pms; Owner: mm-developer01
--

ALTER TABLE ONLY kairali_pms.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_token_hash_unique; Type: CONSTRAINT; Schema: kairali_pms; Owner: mm-developer01
--

ALTER TABLE ONLY kairali_pms.sessions
    ADD CONSTRAINT sessions_token_hash_unique UNIQUE (token_hash);


--
-- Name: settings settings_pkey; Type: CONSTRAINT; Schema: kairali_pms; Owner: mm-developer01
--

ALTER TABLE ONLY kairali_pms.settings
    ADD CONSTRAINT settings_pkey PRIMARY KEY (key);


--
-- Name: stock_movements stock_movements_pkey; Type: CONSTRAINT; Schema: kairali_pms; Owner: mm-developer01
--

ALTER TABLE ONLY kairali_pms.stock_movements
    ADD CONSTRAINT stock_movements_pkey PRIMARY KEY (id);


--
-- Name: submission_throttle submission_throttle_pkey; Type: CONSTRAINT; Schema: kairali_pms; Owner: mm-developer01
--

ALTER TABLE ONLY kairali_pms.submission_throttle
    ADD CONSTRAINT submission_throttle_pkey PRIMARY KEY (ip_hash);


--
-- Name: submissions submissions_pkey; Type: CONSTRAINT; Schema: kairali_pms; Owner: mm-developer01
--

ALTER TABLE ONLY kairali_pms.submissions
    ADD CONSTRAINT submissions_pkey PRIMARY KEY (id);


--
-- Name: submissions submissions_ref_no_unique; Type: CONSTRAINT; Schema: kairali_pms; Owner: mm-developer01
--

ALTER TABLE ONLY kairali_pms.submissions
    ADD CONSTRAINT submissions_ref_no_unique UNIQUE (ref_no);


--
-- Name: titles titles_isbn_unique; Type: CONSTRAINT; Schema: kairali_pms; Owner: mm-developer01
--

ALTER TABLE ONLY kairali_pms.titles
    ADD CONSTRAINT titles_isbn_unique UNIQUE (isbn);


--
-- Name: titles titles_pkey; Type: CONSTRAINT; Schema: kairali_pms; Owner: mm-developer01
--

ALTER TABLE ONLY kairali_pms.titles
    ADD CONSTRAINT titles_pkey PRIMARY KEY (id);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: kairali_pms; Owner: mm-developer01
--

ALTER TABLE ONLY kairali_pms.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: kairali_pms; Owner: mm-developer01
--

ALTER TABLE ONLY kairali_pms.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_audit_at; Type: INDEX; Schema: kairali_pms; Owner: mm-developer01
--

CREATE INDEX idx_audit_at ON kairali_pms.audit_log USING btree (at);


--
-- Name: idx_audit_user; Type: INDEX; Schema: kairali_pms; Owner: mm-developer01
--

CREATE INDEX idx_audit_user ON kairali_pms.audit_log USING btree (user_id);


--
-- Name: idx_authors_name; Type: INDEX; Schema: kairali_pms; Owner: mm-developer01
--

CREATE INDEX idx_authors_name ON kairali_pms.authors USING btree (name);


--
-- Name: idx_contracts_author; Type: INDEX; Schema: kairali_pms; Owner: mm-developer01
--

CREATE INDEX idx_contracts_author ON kairali_pms.contracts USING btree (author_id);


--
-- Name: idx_moves_title; Type: INDEX; Schema: kairali_pms; Owner: mm-developer01
--

CREATE INDEX idx_moves_title ON kairali_pms.stock_movements USING btree (title_id, at);


--
-- Name: idx_moves_user; Type: INDEX; Schema: kairali_pms; Owner: mm-developer01
--

CREATE INDEX idx_moves_user ON kairali_pms.stock_movements USING btree (user_id);


--
-- Name: idx_outbox_status; Type: INDEX; Schema: kairali_pms; Owner: mm-developer01
--

CREATE INDEX idx_outbox_status ON kairali_pms.email_outbox USING btree (status, created_at);


--
-- Name: idx_payouts_author; Type: INDEX; Schema: kairali_pms; Owner: mm-developer01
--

CREATE INDEX idx_payouts_author ON kairali_pms.payouts USING btree (author_id);


--
-- Name: idx_payouts_created_by; Type: INDEX; Schema: kairali_pms; Owner: mm-developer01
--

CREATE INDEX idx_payouts_created_by ON kairali_pms.payouts USING btree (created_by);


--
-- Name: idx_printjobs_created_by; Type: INDEX; Schema: kairali_pms; Owner: mm-developer01
--

CREATE INDEX idx_printjobs_created_by ON kairali_pms.print_jobs USING btree (created_by);


--
-- Name: idx_printjobs_status; Type: INDEX; Schema: kairali_pms; Owner: mm-developer01
--

CREATE INDEX idx_printjobs_status ON kairali_pms.print_jobs USING btree (status);


--
-- Name: idx_printjobs_title; Type: INDEX; Schema: kairali_pms; Owner: mm-developer01
--

CREATE INDEX idx_printjobs_title ON kairali_pms.print_jobs USING btree (title_id);


--
-- Name: idx_salelines_sale; Type: INDEX; Schema: kairali_pms; Owner: mm-developer01
--

CREATE INDEX idx_salelines_sale ON kairali_pms.sale_lines USING btree (sale_id);


--
-- Name: idx_salelines_title; Type: INDEX; Schema: kairali_pms; Owner: mm-developer01
--

CREATE INDEX idx_salelines_title ON kairali_pms.sale_lines USING btree (title_id);


--
-- Name: idx_sales_channel; Type: INDEX; Schema: kairali_pms; Owner: mm-developer01
--

CREATE INDEX idx_sales_channel ON kairali_pms.sales USING btree (channel);


--
-- Name: idx_sales_created_by; Type: INDEX; Schema: kairali_pms; Owner: mm-developer01
--

CREATE INDEX idx_sales_created_by ON kairali_pms.sales USING btree (created_by);


--
-- Name: idx_sales_date; Type: INDEX; Schema: kairali_pms; Owner: mm-developer01
--

CREATE INDEX idx_sales_date ON kairali_pms.sales USING btree (sold_on);


--
-- Name: idx_sales_dealer; Type: INDEX; Schema: kairali_pms; Owner: mm-developer01
--

CREATE INDEX idx_sales_dealer ON kairali_pms.sales USING btree (dealer_id);


--
-- Name: idx_sales_return_of; Type: INDEX; Schema: kairali_pms; Owner: mm-developer01
--

CREATE INDEX idx_sales_return_of ON kairali_pms.sales USING btree (return_of_sale_id);


--
-- Name: idx_sessions_expires; Type: INDEX; Schema: kairali_pms; Owner: mm-developer01
--

CREATE INDEX idx_sessions_expires ON kairali_pms.sessions USING btree (expires_at);


--
-- Name: idx_sessions_user; Type: INDEX; Schema: kairali_pms; Owner: mm-developer01
--

CREATE INDEX idx_sessions_user ON kairali_pms.sessions USING btree (user_id);


--
-- Name: idx_submissions_at; Type: INDEX; Schema: kairali_pms; Owner: mm-developer01
--

CREATE INDEX idx_submissions_at ON kairali_pms.submissions USING btree (submitted_at);


--
-- Name: idx_submissions_email; Type: INDEX; Schema: kairali_pms; Owner: mm-developer01
--

CREATE INDEX idx_submissions_email ON kairali_pms.submissions USING btree (email);


--
-- Name: idx_submissions_reviewed_by; Type: INDEX; Schema: kairali_pms; Owner: mm-developer01
--

CREATE INDEX idx_submissions_reviewed_by ON kairali_pms.submissions USING btree (reviewed_by);


--
-- Name: idx_submissions_status; Type: INDEX; Schema: kairali_pms; Owner: mm-developer01
--

CREATE INDEX idx_submissions_status ON kairali_pms.submissions USING btree (status);


--
-- Name: idx_titles_author; Type: INDEX; Schema: kairali_pms; Owner: mm-developer01
--

CREATE INDEX idx_titles_author ON kairali_pms.titles USING btree (author_id);


--
-- Name: idx_titles_name; Type: INDEX; Schema: kairali_pms; Owner: mm-developer01
--

CREATE INDEX idx_titles_name ON kairali_pms.titles USING btree (name);


--
-- Name: idx_titles_parent; Type: INDEX; Schema: kairali_pms; Owner: mm-developer01
--

CREATE INDEX idx_titles_parent ON kairali_pms.titles USING btree (parent_title_id);


--
-- Name: audit_log audit_log_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: kairali_pms; Owner: mm-developer01
--

ALTER TABLE ONLY kairali_pms.audit_log
    ADD CONSTRAINT audit_log_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES kairali_pms.users(id);


--
-- Name: contracts contracts_author_id_authors_id_fk; Type: FK CONSTRAINT; Schema: kairali_pms; Owner: mm-developer01
--

ALTER TABLE ONLY kairali_pms.contracts
    ADD CONSTRAINT contracts_author_id_authors_id_fk FOREIGN KEY (author_id) REFERENCES kairali_pms.authors(id) ON DELETE CASCADE;


--
-- Name: contracts contracts_title_id_titles_id_fk; Type: FK CONSTRAINT; Schema: kairali_pms; Owner: mm-developer01
--

ALTER TABLE ONLY kairali_pms.contracts
    ADD CONSTRAINT contracts_title_id_titles_id_fk FOREIGN KEY (title_id) REFERENCES kairali_pms.titles(id) ON DELETE CASCADE;


--
-- Name: payouts payouts_author_id_authors_id_fk; Type: FK CONSTRAINT; Schema: kairali_pms; Owner: mm-developer01
--

ALTER TABLE ONLY kairali_pms.payouts
    ADD CONSTRAINT payouts_author_id_authors_id_fk FOREIGN KEY (author_id) REFERENCES kairali_pms.authors(id) ON DELETE CASCADE;


--
-- Name: payouts payouts_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: kairali_pms; Owner: mm-developer01
--

ALTER TABLE ONLY kairali_pms.payouts
    ADD CONSTRAINT payouts_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES kairali_pms.users(id);


--
-- Name: print_jobs print_jobs_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: kairali_pms; Owner: mm-developer01
--

ALTER TABLE ONLY kairali_pms.print_jobs
    ADD CONSTRAINT print_jobs_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES kairali_pms.users(id);


--
-- Name: print_jobs print_jobs_title_id_titles_id_fk; Type: FK CONSTRAINT; Schema: kairali_pms; Owner: mm-developer01
--

ALTER TABLE ONLY kairali_pms.print_jobs
    ADD CONSTRAINT print_jobs_title_id_titles_id_fk FOREIGN KEY (title_id) REFERENCES kairali_pms.titles(id) ON DELETE RESTRICT;


--
-- Name: production_projects production_projects_cover_assigned_to_fkey; Type: FK CONSTRAINT; Schema: kairali_pms; Owner: mm-developer01
--

ALTER TABLE ONLY kairali_pms.production_projects
    ADD CONSTRAINT production_projects_cover_assigned_to_fkey FOREIGN KEY (cover_assigned_to) REFERENCES kairali_pms.users(id) ON DELETE SET NULL;


--
-- Name: production_projects production_projects_dtp_assigned_to_fkey; Type: FK CONSTRAINT; Schema: kairali_pms; Owner: mm-developer01
--

ALTER TABLE ONLY kairali_pms.production_projects
    ADD CONSTRAINT production_projects_dtp_assigned_to_fkey FOREIGN KEY (dtp_assigned_to) REFERENCES kairali_pms.users(id) ON DELETE SET NULL;


--
-- Name: production_projects production_projects_editing_assigned_to_fkey; Type: FK CONSTRAINT; Schema: kairali_pms; Owner: mm-developer01
--

ALTER TABLE ONLY kairali_pms.production_projects
    ADD CONSTRAINT production_projects_editing_assigned_to_fkey FOREIGN KEY (editing_assigned_to) REFERENCES kairali_pms.users(id) ON DELETE SET NULL;


--
-- Name: production_projects production_projects_isbn_assigned_to_fkey; Type: FK CONSTRAINT; Schema: kairali_pms; Owner: mm-developer01
--

ALTER TABLE ONLY kairali_pms.production_projects
    ADD CONSTRAINT production_projects_isbn_assigned_to_fkey FOREIGN KEY (isbn_assigned_to) REFERENCES kairali_pms.users(id) ON DELETE SET NULL;


--
-- Name: production_projects production_projects_print_job_id_fkey; Type: FK CONSTRAINT; Schema: kairali_pms; Owner: mm-developer01
--

ALTER TABLE ONLY kairali_pms.production_projects
    ADD CONSTRAINT production_projects_print_job_id_fkey FOREIGN KEY (print_job_id) REFERENCES kairali_pms.print_jobs(id) ON DELETE SET NULL;


--
-- Name: production_projects production_projects_proof_assigned_to_fkey; Type: FK CONSTRAINT; Schema: kairali_pms; Owner: mm-developer01
--

ALTER TABLE ONLY kairali_pms.production_projects
    ADD CONSTRAINT production_projects_proof_assigned_to_fkey FOREIGN KEY (proof_assigned_to) REFERENCES kairali_pms.users(id) ON DELETE SET NULL;


--
-- Name: production_projects production_projects_title_id_fkey; Type: FK CONSTRAINT; Schema: kairali_pms; Owner: mm-developer01
--

ALTER TABLE ONLY kairali_pms.production_projects
    ADD CONSTRAINT production_projects_title_id_fkey FOREIGN KEY (title_id) REFERENCES kairali_pms.titles(id) ON DELETE CASCADE;


--
-- Name: sale_lines sale_lines_sale_id_sales_id_fk; Type: FK CONSTRAINT; Schema: kairali_pms; Owner: mm-developer01
--

ALTER TABLE ONLY kairali_pms.sale_lines
    ADD CONSTRAINT sale_lines_sale_id_sales_id_fk FOREIGN KEY (sale_id) REFERENCES kairali_pms.sales(id) ON DELETE CASCADE;


--
-- Name: sale_lines sale_lines_title_id_titles_id_fk; Type: FK CONSTRAINT; Schema: kairali_pms; Owner: mm-developer01
--

ALTER TABLE ONLY kairali_pms.sale_lines
    ADD CONSTRAINT sale_lines_title_id_titles_id_fk FOREIGN KEY (title_id) REFERENCES kairali_pms.titles(id) ON DELETE RESTRICT;


--
-- Name: sales sales_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: kairali_pms; Owner: mm-developer01
--

ALTER TABLE ONLY kairali_pms.sales
    ADD CONSTRAINT sales_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES kairali_pms.users(id);


--
-- Name: sales sales_dealer_id_dealers_id_fk; Type: FK CONSTRAINT; Schema: kairali_pms; Owner: mm-developer01
--

ALTER TABLE ONLY kairali_pms.sales
    ADD CONSTRAINT sales_dealer_id_dealers_id_fk FOREIGN KEY (dealer_id) REFERENCES kairali_pms.dealers(id) ON DELETE SET NULL;


--
-- Name: sales sales_return_of_sale_id_sales_id_fk; Type: FK CONSTRAINT; Schema: kairali_pms; Owner: mm-developer01
--

ALTER TABLE ONLY kairali_pms.sales
    ADD CONSTRAINT sales_return_of_sale_id_sales_id_fk FOREIGN KEY (return_of_sale_id) REFERENCES kairali_pms.sales(id) ON DELETE SET NULL;


--
-- Name: sessions sessions_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: kairali_pms; Owner: mm-developer01
--

ALTER TABLE ONLY kairali_pms.sessions
    ADD CONSTRAINT sessions_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES kairali_pms.users(id) ON DELETE CASCADE;


--
-- Name: settings settings_updated_by_users_id_fk; Type: FK CONSTRAINT; Schema: kairali_pms; Owner: mm-developer01
--

ALTER TABLE ONLY kairali_pms.settings
    ADD CONSTRAINT settings_updated_by_users_id_fk FOREIGN KEY (updated_by) REFERENCES kairali_pms.users(id);


--
-- Name: stock_movements stock_movements_title_id_titles_id_fk; Type: FK CONSTRAINT; Schema: kairali_pms; Owner: mm-developer01
--

ALTER TABLE ONLY kairali_pms.stock_movements
    ADD CONSTRAINT stock_movements_title_id_titles_id_fk FOREIGN KEY (title_id) REFERENCES kairali_pms.titles(id) ON DELETE CASCADE;


--
-- Name: stock_movements stock_movements_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: kairali_pms; Owner: mm-developer01
--

ALTER TABLE ONLY kairali_pms.stock_movements
    ADD CONSTRAINT stock_movements_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES kairali_pms.users(id);


--
-- Name: submissions submissions_reviewed_by_users_id_fk; Type: FK CONSTRAINT; Schema: kairali_pms; Owner: mm-developer01
--

ALTER TABLE ONLY kairali_pms.submissions
    ADD CONSTRAINT submissions_reviewed_by_users_id_fk FOREIGN KEY (reviewed_by) REFERENCES kairali_pms.users(id);


--
-- Name: titles titles_author_id_authors_id_fk; Type: FK CONSTRAINT; Schema: kairali_pms; Owner: mm-developer01
--

ALTER TABLE ONLY kairali_pms.titles
    ADD CONSTRAINT titles_author_id_authors_id_fk FOREIGN KEY (author_id) REFERENCES kairali_pms.authors(id) ON DELETE SET NULL;


--
-- Name: titles titles_parent_title_id_titles_id_fk; Type: FK CONSTRAINT; Schema: kairali_pms; Owner: mm-developer01
--

ALTER TABLE ONLY kairali_pms.titles
    ADD CONSTRAINT titles_parent_title_id_titles_id_fk FOREIGN KEY (parent_title_id) REFERENCES kairali_pms.titles(id) ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

\unrestrict JHiDkl9sFDT0YVTshOjRsFF21fTek3EKfIMznpYmIrBUAcMWTJ2S5aTUI3B9d8K

