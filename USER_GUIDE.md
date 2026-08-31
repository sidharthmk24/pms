# Kairali PMS — User Guide & Operations Manual

Welcome to **Kairali PMS** (Publisher Management System), the digital publishing operations platform built for **Kairali Books** (Malayalam book publisher).

This guide covers the core end-to-end workflows across the system: from public manuscript submission and editorial review, to digital contract execution, DTP production, and team management.

---

## 1. System Roles & Access Levels

Kairali PMS operates on three focused publishing roles:

| Role | Primary Responsibilities | Default Access |
| :--- | :--- | :--- |
| **Owner** | Full publisher oversight, commercial terms approval, legal agreement digital signing, team management, and financial reporting. | All PMS features & settings |
| **Editor** | Manuscript submission review, editorial evaluation, decision-making (Accept / Reject / Revise), and pipeline handoff. | Submissions, Contracts, Production |
| **Production** | Typesetting, DTP layout, cover design review, galley proof verification, printer coordination, and stock receipt logging. | Production Pipeline, Print Jobs |

---

## 2. Public Author Submission & Self-Tracking Portal

Authors can submit manuscripts and track their publication status via clean, public-facing pages in English without needing to log in.

### 2.1 Submitting a Manuscript (`/publish`)
1. Visit **`http://localhost:3000/publish`**.
2. Read the publishing guidelines and click **"Submit Your Manuscript"**.
3. Fill out the submission form:
   - **Author Details**: Full Legal Name, Email, Phone, and Postal Address.
   - **Book Details**: Title, Malayalam Title, Literary Genre (Novel, Poetry, Essays, Biography, etc.), Language, Estimated Page Count, and Abstract/Synopsis.
   - **Files**: Upload Sample Manuscript (`.pdf`, `.docx`) and Optional Author Photo.
4. Submit the form to receive a unique **Tracking ID** (e.g. `KB-SUB-2026-0001`) and a direct tracking link.

### 2.2 Public Author Status Tracker (`/publish/status`)
- Authors can track their submission anytime using their **Tracking ID** or **Email Address**.
- The tracking dashboard provides live visual status updates:
  - `Pending Review` $\rightarrow$ `Under Editorial Review` $\rightarrow$ `Accepted (Contract Issued)` $\rightarrow$ `In DTP Production` $\rightarrow$ `Published`.

---

## 3. Editorial Submission Review Workflow (`/submissions`)

Editors and Owners evaluate submissions from the internal PMS dashboard:

1. Log in to the PMS at **`http://localhost:3000/login`**.
2. Navigate to **"Submissions"** in the sidebar.
3. Click on any submission to open the **Submission Detail View**:
   - Inspect author details, pitch, synopsis, and metadata.
   - Download or view the submitted manuscript file.
   - Reassign the reviewer or add internal editorial notes.
4. Click **"Submit Review Decision"**:
   - **Accept Submission**: Opens the Commercial Contract Generator.
   - **Request Revision**: Sends feedback notes to the author for manuscript improvements.
   - **Reject Submission**: Sends formal editorial decline with customized reasoning.

---

## 4. Contract Generation & Commercial Terms

When accepting a submission, the editor/owner configures the commercial terms for the legal agreement:

### 4.1 Publishing Tracks
- **Traditional (Kairali-Funded)**:
  - Publisher funds 100% of production and distribution.
  - **Royalty Rate (%)**: e.g., 10% to 15% calculated on **MRP** or **Net Realized Receipts**.
  - **Advance on Signing (₹)**: Optional advance against future royalties (e.g., ₹10,000.00).
- **Self-Publishing (Author-Funded)**:
  - Author funds typesetting and initial print run.
  - **Package Cost (₹)**: Base fee + **18% GST** breakdown automatically calculated.
  - Distribution copies and author stock allocation.

### 4.2 Standard Publishing Clauses
- **Complimentary Copies**: e.g., 10 free author copies upon release.
- **Author Discount**: e.g., 40% discount off MRP for additional author purchases.
- **Contract Duration**: 3 to 5 years exclusive print rights in Malayalam.

---

## 5. Digital Dual-Signing Workflow

Agreements are executed digitally under the Indian Information Technology Act, capturing timestamps, IP addresses, and user verification.

```mermaid
sequenceDiagram
    autonumber
    actor Editor as Editor / Owner
    actor Author as Author
    participant PMS as Kairali PMS
    
    Editor->>PMS: Accept Submission with Commercial Terms
    PMS->>PMS: Generate Contract & Legal Reference (CON-2026-XXXX)
    Editor->>Author: Share Private Digital Signing Link
    Author->>PMS: Open Signing Portal (/publish/contract/[id])
    Author->>PMS: Provide PAN & Bank Info, Draw/Type Signature, Accept Legal Consent
    PMS->>PMS: Author Signature Sealed (Timestamp & IP Verified)
    Editor->>PMS: Affix Publisher Digital Seal in PMS (/contracts)
    PMS->>PMS: Status Updates to "Dual-Signed"
    PMS->>PMS: Manuscript Auto-Enrolled in Production Pipeline
```

### 5.1 Author Digital Signing (`/publish/contract/[id]`)
1. The author opens their private contract link.
2. They review the complete 6 legal articles:
   - **Article 1**: Grant of Exclusive Rights.
   - **Article 2**: Commercial & Royalty Terms (Royalty %, Advance, Free Copies, Discount).
   - **Article 3**: Term & Exclusivity.
   - **Article 4**: Proofreading & 14-day Galley Proof Review Window.
   - **Article 5**: Copyright Retention & Reversion of Rights.
   - **Article 6**: Indian Tax Compliance (Section 194J TDS) & Jurisdiction (Kozhikode, Kerala).
3. **Fill Tax & Royalty Details**: PAN Number (for 194J TDS) and Bank Account/IFSC for royalty payouts.
4. **Signature Options**:
   - **Draw Signature**: Interactive touch/mouse drawing pad.
   - **Type Signature**: Stylized legal script authentication.
5. Check the legal declaration checkbox and click **"Accept & Digitally Sign Agreement"**.

### 5.2 Publisher Digital Signing & Verification (`/contracts`)
1. In the PMS, open **"Contracts"**.
2. Click **"View Agreement"** to inspect all terms, author PAN, and timestamped signature.
3. Click **"Publisher Sign"** $\rightarrow$ Affix Digital Seal.
4. Status transitions to **`Dual-Signed`**.

---

## 6. Official PDF & Print Export (`/contracts/[id]/print`)

- Click **"View Agreement"** $\rightarrow$ **"Print / Save Official PDF"** (or open `/contracts/[id]/print`).
- Renders a clean A4 printable document with:
  - Official **Kairali Books letterhead** (GSTIN, PAN, Rajaji Road, Kozhikode address).
  - Structured legal articles (1 through 6).
  - Certified dual digital signature verification stamps.
  - Automatic isolation from all web application UI, modals, and background tables.

---

## 7. Production & DTP Typesetting Pipeline (`/production`)

Once dual-signed, titles enter the active **Production Pipeline**:

1. Navigate to **"Production"** in the sidebar.
2. Track manuscript progress across 6 production stages:
   - `DTP & Typesetting` $\rightarrow$ `Cover Design` $\rightarrow$ `Proofreading & Corrections` $\rightarrow$ `Author Galley Approval` $\rightarrow$ `Press Batching / Printing` $\rightarrow$ `Stock Received & Published`.
3. Update ISBN, category, price locks (MRP), and binder deliveries.
4. Record **Print Receipts**: Automatically increments warehouse stock cache and appends immutable audit ledger movements.

---

## 8. Team Management (`/team`)

Owners can manage staff members and assign roles:

1. Navigate to **"Team"** in the sidebar.
2. Click **"Add Team Member"** or edit existing staff.
3. Configure:
   - Full Name & Email Address.
   - Initial Password (stored securely with bcrypt).
   - Role Selection: **`Editor`**, **`Production`**, or **`Owner`**.
   - Active / Inactive status toggle.

---

## 9. Live Cloud Test Accounts & Credentials

| Role | Test Email | Password | Access URL |
| :--- | :--- | :--- | :--- |
| **Owner** | `owner@kairalibooks.in` | `kairali123` | `http://localhost:3000/dashboard` |
| **Editor** | `editor@kairalibooks.in` | `kairali123` | `http://localhost:3000/submissions` |
| **Production** | `press@kairalibooks.in` | `kairali123` | `http://localhost:3000/production` |
| **Public Portal** | *No login needed* | *N/A* | `http://localhost:3000/publish` |
