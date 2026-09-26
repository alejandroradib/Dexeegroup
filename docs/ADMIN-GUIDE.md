# Admin guide (Dexee staff)

## Daily loop

1. **Dashboard** (`/admin`): pending companies, vacancies to review, contact requests, attempts to validate, hires without a placement.
2. **Companies**: open a pending company, check the website and legal name, click Verify. Select the vacancies waiting in review to publish them in the same action. Suspend a company that misuses the platform; its vacancies disappear and its users lose access to applicants.
3. **Vacancies**: the review queue lists `pending_review` and `changes_requested`. Approve publishes immediately. Request changes sends the company a message that appears at the top of their wizard. Commercial terms (bill rate, placement fee, internal notes) are visible only to Dexee.
4. **Applications**: release contact details only when the company is ready to move forward; the company then sees email, phone, LinkedIn and can download the resume. Use the status select to move applications when you act on behalf of a company.
5. **Candidates**: search by skill, level, availability or tag. Add Dexee-only notes and tags. Recommend a candidate to a vacancy: this creates a shortlisted application labeled "Recommended by Dexee" for both parties. Export the current filter as CSV; every export is logged.
6. **Assessments**: validate oral attempts by listening to each recording, reading the transcript and AI scores, entering pronunciation and intelligibility, and confirming or overriding the level. Reject bad audio so the candidate can retake within the week. Written attempts arrive here only when the MCQ and writing levels differ by two levels or the text was flagged.
7. **Placements**: when an application reaches Hired, record the placement with contract type, start date, salary and bill rate. The list shows monthly margin per placement and the total.

## Rules to remember

- Contact data is released per application, never globally.
- Assessment results are screening results, not certifications. Do not describe them otherwise to clients.
- Every action you take is written to the activity log (`/admin/activity`).
- Settings lets you edit assessment thresholds and prompts; each save bumps the version. Change the consent text version in code together with the privacy policy.

## Seed accounts (dev only)

Password for all: `DexeeSeed2026!`

| Role                     | Email                                                         |
| ------------------------ | ------------------------------------------------------------- |
| Admin                    | admin@example.com                                          |
| Company owner (pending)  | owner@northwind-logistics.example.com                         |
| Company owner (verified) | owner@harborhealth.example.com                                |
| Company owner (verified) | owner@brightline.example.com                                  |
| Candidate                | laura.gomez@example.com and seven more in `supabase/seed.sql` |
