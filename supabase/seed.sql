-- Development seed. Every account uses the password "DexeeSeed2026!".
-- Fixed UUIDs so tests and docs can reference rows.
-- Users: a0.. admin, c0.. company owners, d0.. candidates. Companies b0.., jobs e0.., applications f0..

-- ---------------------------------------------------------------------------
-- Auth users (fires handle_new_user -> profiles)
-- ---------------------------------------------------------------------------
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, confirmation_token, recovery_token, email_change_token_new, email_change, created_at, updated_at)
values
  ('a0000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@dexeegroup.com', '$2b$10$pes8d.KT0F.Ua..27SzpNO6Iog6yX/0IWpfe0gs3dkmYVLAktrFWq', now(), '{"provider":"email","providers":["email"]}', '{"role":"candidate","full_name":"Dexee Admin","locale":"en"}', '', '', '', '', now(), now()),
  ('c0000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'owner@northwind-logistics.example.com', '$2b$10$pes8d.KT0F.Ua..27SzpNO6Iog6yX/0IWpfe0gs3dkmYVLAktrFWq', now(), '{"provider":"email","providers":["email"]}', '{"role":"company","full_name":"Dana Whitfield","locale":"en"}', '', '', '', '', now(), now()),
  ('c0000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'owner@harborhealth.example.com', '$2b$10$pes8d.KT0F.Ua..27SzpNO6Iog6yX/0IWpfe0gs3dkmYVLAktrFWq', now(), '{"provider":"email","providers":["email"]}', '{"role":"company","full_name":"Marcus Lee","locale":"en"}', '', '', '', '', now(), now()),
  ('c0000000-0000-4000-8000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'owner@brightline.example.com', '$2b$10$pes8d.KT0F.Ua..27SzpNO6Iog6yX/0IWpfe0gs3dkmYVLAktrFWq', now(), '{"provider":"email","providers":["email"]}', '{"role":"company","full_name":"Priya Natarajan","locale":"en"}', '', '', '', '', now(), now()),
  ('c0000000-0000-4000-8000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'member@brightline.example.com', '$2b$10$pes8d.KT0F.Ua..27SzpNO6Iog6yX/0IWpfe0gs3dkmYVLAktrFWq', now(), '{"provider":"email","providers":["email"]}', '{"role":"company","full_name":"Tom Alvarez","locale":"en"}', '', '', '', '', now(), now()),
  ('d0000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'laura.gomez@example.com', '$2b$10$pes8d.KT0F.Ua..27SzpNO6Iog6yX/0IWpfe0gs3dkmYVLAktrFWq', now(), '{"provider":"email","providers":["email"]}', '{"role":"candidate","full_name":"Laura Gómez","locale":"es"}', '', '', '', '', now(), now()),
  ('d0000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'andres.pineda@example.com', '$2b$10$pes8d.KT0F.Ua..27SzpNO6Iog6yX/0IWpfe0gs3dkmYVLAktrFWq', now(), '{"provider":"email","providers":["email"]}', '{"role":"candidate","full_name":"Andrés Pineda","locale":"es"}', '', '', '', '', now(), now()),
  ('d0000000-0000-4000-8000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'camila.rojas@example.com', '$2b$10$pes8d.KT0F.Ua..27SzpNO6Iog6yX/0IWpfe0gs3dkmYVLAktrFWq', now(), '{"provider":"email","providers":["email"]}', '{"role":"candidate","full_name":"Camila Rojas","locale":"es"}', '', '', '', '', now(), now()),
  ('d0000000-0000-4000-8000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'santiago.mora@example.com', '$2b$10$pes8d.KT0F.Ua..27SzpNO6Iog6yX/0IWpfe0gs3dkmYVLAktrFWq', now(), '{"provider":"email","providers":["email"]}', '{"role":"candidate","full_name":"Santiago Mora","locale":"es"}', '', '', '', '', now(), now()),
  ('d0000000-0000-4000-8000-000000000005', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'valentina.ruiz@example.com', '$2b$10$pes8d.KT0F.Ua..27SzpNO6Iog6yX/0IWpfe0gs3dkmYVLAktrFWq', now(), '{"provider":"email","providers":["email"]}', '{"role":"candidate","full_name":"Valentina Ruiz","locale":"es"}', '', '', '', '', now(), now()),
  ('d0000000-0000-4000-8000-000000000006', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'daniel.castro@example.com', '$2b$10$pes8d.KT0F.Ua..27SzpNO6Iog6yX/0IWpfe0gs3dkmYVLAktrFWq', now(), '{"provider":"email","providers":["email"]}', '{"role":"candidate","full_name":"Daniel Castro","locale":"en"}', '', '', '', '', now(), now()),
  ('d0000000-0000-4000-8000-000000000007', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'mariana.torres@example.com', '$2b$10$pes8d.KT0F.Ua..27SzpNO6Iog6yX/0IWpfe0gs3dkmYVLAktrFWq', now(), '{"provider":"email","providers":["email"]}', '{"role":"candidate","full_name":"Mariana Torres","locale":"es"}', '', '', '', '', now(), now()),
  ('d0000000-0000-4000-8000-000000000008', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'felipe.herrera@example.com', '$2b$10$pes8d.KT0F.Ua..27SzpNO6Iog6yX/0IWpfe0gs3dkmYVLAktrFWq', now(), '{"provider":"email","providers":["email"]}', '{"role":"candidate","full_name":"Felipe Herrera","locale":"es"}', '', '', '', '', now(), now())
on conflict (id) do nothing;

insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), u.id, u.id::text, jsonb_build_object('sub', u.id::text, 'email', u.email), 'email', now(), now(), now()
from auth.users u
where u.id::text like 'a0000000-%' or u.id::text like 'c0000000-%' or u.id::text like 'd0000000-%'
on conflict do nothing;

-- Admin promotion (only ever done server-side)
update public.profiles set role = 'admin' where id = 'a0000000-0000-4000-8000-000000000001';

-- ---------------------------------------------------------------------------
-- Companies: one pending, two verified
-- ---------------------------------------------------------------------------
insert into public.companies (id, owner_user_id, name, legal_name, website, sector, country, state, city, size, description, status, verified_at, verified_by, hiring_needs)
values
  ('b0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', 'Northwind Logistics', 'Northwind Logistics LLC', 'https://northwind-logistics.example.com', 'logistics', 'US', 'TX', 'Houston', 's51_200',
   'Third-party logistics provider serving mid-market shippers across the Gulf Coast.', 'pending', null, null,
   '{"role_families":["customer_support","operations_va"],"expected_hires":4,"preferred_contract_types":["dexee_eor"]}'),
  ('b0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000002', 'Harbor Health Admin', 'Harbor Health Administrative Services Inc.', 'https://harborhealth.example.com', 'healthcare', 'US', 'FL', 'Tampa', 's201_1000',
   'Revenue-cycle and administrative services for outpatient clinics. No clinical roles.', 'verified', now() - interval '20 days', 'a0000000-0000-4000-8000-000000000001',
   '{"role_families":["finance_accounting","customer_support"],"expected_hires":10,"preferred_contract_types":["dexee_eor","independent_contractor"]}'),
  ('b0000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-000000000003', 'Brightline SaaS', 'Brightline Software Inc.', 'https://brightline.example.com', 'technology', 'US', 'CO', 'Denver', 's11_50',
   'B2B analytics platform for property managers. Fully remote team.', 'verified', now() - interval '45 days', 'a0000000-0000-4000-8000-000000000001',
   '{"role_families":["software_engineering","data","sales_sdr"],"expected_hires":6,"preferred_contract_types":["independent_contractor","direct_hire"]}')
on conflict (id) do nothing;

-- Accepted member at Brightline
insert into public.company_members (company_id, user_id, role, accepted_at, invited_by)
values ('b0000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-000000000004', 'member', now() - interval '10 days', 'c0000000-0000-4000-8000-000000000003')
on conflict do nothing;

-- Pending invite at Harbor
insert into public.company_members (company_id, invited_email, role, invite_token, invited_by)
values ('b0000000-0000-4000-8000-000000000002', 'finance.lead@harborhealth.example.com', 'member', 'seed-invite-token-harbor-0001', 'c0000000-0000-4000-8000-000000000002')
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Jobs: six published (one confidential, one hiding salary), one pending review, one draft
-- ---------------------------------------------------------------------------
insert into public.jobs (id, company_id, title, slug, role_family, seniority, description, responsibilities, requirements, skills, english_level_required, employment_type, work_mode, contract_type, hours_per_week, timezone_overlap, salary_min_usd, salary_max_usd, show_salary, confidential_company, status, published_at, created_by)
values
  ('e0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002', 'Senior Accountant (US GAAP)', 'senior-accountant-us-gaap-e00001', 'finance_accounting', 'senior',
   'Own month-end close for a portfolio of outpatient clinics and report to the US controller.',
   E'- Prepare journal entries, reconciliations and month-end close packages\n- Maintain the fixed asset register and accruals\n- Support the annual audit and respond to auditor requests\n- Improve close checklists and documentation',
   E'- 5+ years in accounting, at least 2 with US GAAP\n- QuickBooks Online or NetSuite\n- Advanced Excel\n- English C1 for daily calls with the US team',
   array['US GAAP','NetSuite','QuickBooks','Excel','Month-end close'], 'C1', 'full_time', 'remote', 'dexee_eor', 40, 'full_et', 2800, 3600, true, false, 'published', now() - interval '12 days', 'c0000000-0000-4000-8000-000000000002'),
  ('e0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000002', 'Patient Support Specialist (bilingual)', 'patient-support-specialist-bilingual-e00002', 'customer_support', 'mid',
   'Handle inbound scheduling and billing questions for clinic patients by phone and chat.',
   E'- Answer scheduling and billing calls in English and Spanish\n- Update patient records in the practice management system\n- Escalate clinical questions to on-site staff\n- Meet response-time and quality targets',
   E'- 2+ years in customer support or healthcare administration\n- Clear spoken English (B2 or higher)\n- Comfortable with high call volume',
   array['Customer support','Healthcare admin','Zendesk','Spanish'], 'B2', 'full_time', 'remote', 'dexee_eor', 40, '4h', 1400, 1800, true, false, 'published', now() - interval '9 days', 'c0000000-0000-4000-8000-000000000002'),
  ('e0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000003', 'Full-stack Engineer (TypeScript)', 'full-stack-engineer-typescript-e00003', 'software_engineering', 'senior',
   'Build and ship features across our Next.js front end and Node services for property analytics.',
   E'- Deliver features end to end with product and design\n- Write tests and review pull requests\n- Own reliability of the services you build\n- Participate in on-call rotation during US hours',
   E'- 5+ years building web applications\n- TypeScript, React, Node.js, PostgreSQL\n- Experience with cloud infrastructure (AWS or GCP)\n- English C1',
   array['TypeScript','React','Node.js','PostgreSQL','AWS'], 'C1', 'full_time', 'remote', 'independent_contractor', 40, '4h', 4500, 6500, true, false, 'published', now() - interval '7 days', 'c0000000-0000-4000-8000-000000000003'),
  ('e0000000-0000-4000-8000-000000000004', 'b0000000-0000-4000-8000-000000000003', 'Data Analyst', 'data-analyst-e00004', 'data', 'mid',
   'Turn product and customer data into dashboards and recommendations for the leadership team.',
   E'- Build and maintain dashboards in Looker\n- Write SQL against our warehouse\n- Run ad hoc analyses and present findings\n- Define metrics with product managers',
   E'- 3+ years as an analyst\n- Strong SQL, dbt a plus\n- Looker or Tableau\n- English B2 or higher',
   array['SQL','Looker','dbt','Python','Data modeling'], 'B2', 'full_time', 'remote', 'independent_contractor', 40, '2h', 2500, 3500, false, false, 'published', now() - interval '5 days', 'c0000000-0000-4000-8000-000000000003'),
  ('e0000000-0000-4000-8000-000000000005', 'b0000000-0000-4000-8000-000000000003', 'Sales Development Representative', 'sales-development-representative-e00005', 'sales_sdr', 'junior',
   'Book qualified meetings with property management companies across the US.',
   E'- Research and prospect target accounts\n- Run outbound sequences by email and phone\n- Qualify leads and hand off to account executives\n- Keep the CRM accurate',
   E'- 1+ years in outbound sales or lead generation\n- Native-level spoken English (C1)\n- HubSpot or Salesforce experience',
   array['Outbound sales','HubSpot','Prospecting','Cold calling'], 'C1', 'full_time', 'remote', 'dexee_eor', 40, 'full_ct', 1600, 2200, true, true, 'published', now() - interval '3 days', 'c0000000-0000-4000-8000-000000000003'),
  ('e0000000-0000-4000-8000-000000000006', 'b0000000-0000-4000-8000-000000000002', 'Executive Assistant (part-time)', 'executive-assistant-part-time-e00006', 'operations_va', 'mid',
   'Support two US executives with calendars, travel, expenses and vendor follow-up.',
   E'- Manage calendars across time zones\n- Book travel and process expense reports\n- Prepare meeting notes and follow up on action items\n- Coordinate with vendors and internal teams',
   E'- 3+ years supporting executives\n- Excellent written English (B2+)\n- Google Workspace and Expensify',
   array['Executive support','Calendar management','Google Workspace','Expensify'], 'B2', 'part_time', 'remote', 'independent_contractor', 20, '4h', 900, 1200, true, false, 'published', now() - interval '2 days', 'c0000000-0000-4000-8000-000000000002'),
  ('e0000000-0000-4000-8000-000000000007', 'b0000000-0000-4000-8000-000000000001', 'Dispatch Coordinator (night shift)', 'dispatch-coordinator-night-shift-e00007', 'operations_va', 'mid',
   'Coordinate carriers and drivers for overnight freight moves across Texas and Louisiana.',
   E'- Track loads and update customers\n- Resolve delays with carriers\n- Document exceptions in the TMS',
   E'- 2+ years in dispatch or logistics coordination\n- English B2\n- Availability for US night hours',
   array['Dispatch','TMS','Logistics','Customer communication'], 'B2', 'full_time', 'remote', 'dexee_eor', 40, 'full_ct', 1500, 1900, true, false, 'pending_review', null, 'c0000000-0000-4000-8000-000000000001'),
  ('e0000000-0000-4000-8000-000000000008', 'b0000000-0000-4000-8000-000000000003', 'Product Designer', null, 'design', 'mid',
   'Design flows for our analytics platform.', null, null, array['Figma','UX research'], 'B2', 'full_time', 'remote', 'independent_contractor', 40, '2h', 2500, 3500, true, false, 'draft', null, 'c0000000-0000-4000-8000-000000000003')
on conflict (id) do nothing;

-- Admin-only commercial terms
insert into public.job_commercials (job_id, client_bill_rate_usd, placement_fee_usd, internal_notes, updated_by)
values
  ('e0000000-0000-4000-8000-000000000001', 4800, null, 'EOR: bill rate includes payroll, benefits and Dexee fee.', 'a0000000-0000-4000-8000-000000000001'),
  ('e0000000-0000-4000-8000-000000000003', null, 6500, 'Contractor placement: one-time fee.', 'a0000000-0000-4000-8000-000000000001')
on conflict (job_id) do nothing;

-- ---------------------------------------------------------------------------
-- Candidates
-- ---------------------------------------------------------------------------
insert into public.candidates (id, first_name, last_name, headline, summary, city, years_experience, role_family, skills, desired_roles, desired_salary_min_usd, availability, preferred_contract_types, english_self_level, english_written_level, english_oral_level, english_verified_level, english_verified_at, data_consent_at, data_consent_version)
values
  ('d0000000-0000-4000-8000-000000000001', 'Laura', 'Gómez', 'Senior accountant, US GAAP and NetSuite', 'Eight years in accounting for US subsidiaries in Barranquilla, including four years leading month-end close for a logistics group.', 'Barranquilla', 8.0, 'finance_accounting', array['US GAAP','NetSuite','Excel','Month-end close','IFRS'], array['Senior Accountant','Accounting Manager'], 2900, 'two_weeks', array['dexee_eor','direct_hire']::public.contract_type[], 'C1', 'C1', 'C1', 'C1', now() - interval '30 days', now() - interval '60 days', '2026-09-01'),
  ('d0000000-0000-4000-8000-000000000002', 'Andrés', 'Pineda', 'Full-stack engineer, TypeScript and PostgreSQL', 'Six years building SaaS products for US startups as a contractor. Comfortable owning features end to end.', 'Medellín', 6.0, 'software_engineering', array['TypeScript','React','Node.js','PostgreSQL','AWS','Next.js'], array['Full-stack Engineer','Backend Engineer'], 5000, 'one_month', array['independent_contractor']::public.contract_type[], 'C1', 'C1', null, null, null, now() - interval '50 days', '2026-09-01'),
  ('d0000000-0000-4000-8000-000000000003', 'Camila', 'Rojas', 'Bilingual customer support specialist', 'Four years in healthcare and fintech support for US customers, handling phone, chat and email.', 'Barranquilla', 4.0, 'customer_support', array['Customer support','Zendesk','Healthcare admin','Spanish'], array['Customer Support Specialist','Patient Coordinator'], 1500, 'immediate', array['dexee_eor']::public.contract_type[], 'B2', 'B2', 'B2', 'B2', now() - interval '15 days', now() - interval '40 days', '2026-09-01'),
  ('d0000000-0000-4000-8000-000000000004', 'Santiago', 'Mora', 'Data analyst, SQL and Looker', 'Three years turning product data into dashboards for e-commerce and SaaS teams.', 'Bogotá', 3.0, 'data', array['SQL','Looker','Python','dbt'], array['Data Analyst','Analytics Engineer'], 2600, 'two_weeks', array['independent_contractor','dexee_eor']::public.contract_type[], 'B2', 'B2', null, null, null, now() - interval '35 days', '2026-09-01'),
  ('d0000000-0000-4000-8000-000000000005', 'Valentina', 'Ruiz', 'Sales development representative', 'Two years booking meetings for US B2B software companies. Consistently above quota.', 'Cartagena', 2.0, 'sales_sdr', array['Outbound sales','HubSpot','Cold calling','Prospecting'], array['SDR','BDR'], 1700, 'immediate', array['dexee_eor','independent_contractor']::public.contract_type[], 'C1', null, null, null, null, now() - interval '20 days', '2026-09-01'),
  ('d0000000-0000-4000-8000-000000000006', 'Daniel', 'Castro', 'Executive assistant and operations', 'Five years supporting founders and executives remotely: calendars, travel, vendors and light bookkeeping.', 'Barranquilla', 5.0, 'operations_va', array['Executive support','Calendar management','Google Workspace','Bookkeeping'], array['Executive Assistant','Operations Coordinator'], 1100, 'one_month', array['independent_contractor']::public.contract_type[], 'B2', 'B1', null, null, null, now() - interval '25 days', '2026-09-01'),
  ('d0000000-0000-4000-8000-000000000007', 'Mariana', 'Torres', 'Junior accountant', 'Recent graduate with one year of accounts payable experience for a manufacturing company.', 'Barranquilla', 1.0, 'finance_accounting', array['Accounts payable','Excel'], array['Junior Accountant'], 1200, 'immediate', array['dexee_eor']::public.contract_type[], 'B1', null, null, null, null, now() - interval '5 days', '2026-09-01'),
  ('d0000000-0000-4000-8000-000000000008', 'Felipe', 'Herrera', 'Logistics coordinator', 'Seven years coordinating dispatch and carrier relations for freight forwarders serving the US.', 'Barranquilla', 7.0, 'operations_va', array['Dispatch','TMS','Logistics','Customer communication','Excel'], array['Dispatch Coordinator','Logistics Coordinator'], 1600, 'three_months', array['dexee_eor']::public.contract_type[], 'B2', 'B2', 'B1', 'B1', now() - interval '10 days', now() - interval '70 days', '2026-09-01')
on conflict (id) do nothing;

insert into public.candidate_contacts (candidate_id, email, phone, linkedin_url, portfolio_url, resume_path)
values
  ('d0000000-0000-4000-8000-000000000001', 'laura.gomez@example.com', '+57 300 111 2233', 'https://www.linkedin.com/in/laura-gomez-example', null, 'candidates/d0000000-0000-4000-8000-000000000001/resume.pdf'),
  ('d0000000-0000-4000-8000-000000000002', 'andres.pineda@example.com', '+57 301 222 3344', 'https://www.linkedin.com/in/andres-pineda-example', 'https://andrespineda.example.dev', 'candidates/d0000000-0000-4000-8000-000000000002/resume.pdf'),
  ('d0000000-0000-4000-8000-000000000003', 'camila.rojas@example.com', '+57 302 333 4455', 'https://www.linkedin.com/in/camila-rojas-example', null, 'candidates/d0000000-0000-4000-8000-000000000003/resume.pdf'),
  ('d0000000-0000-4000-8000-000000000004', 'santiago.mora@example.com', '+57 303 444 5566', 'https://www.linkedin.com/in/santiago-mora-example', null, null),
  ('d0000000-0000-4000-8000-000000000005', 'valentina.ruiz@example.com', '+57 304 555 6677', 'https://www.linkedin.com/in/valentina-ruiz-example', null, 'candidates/d0000000-0000-4000-8000-000000000005/resume.pdf'),
  ('d0000000-0000-4000-8000-000000000006', 'daniel.castro@example.com', '+57 305 666 7788', null, null, null),
  ('d0000000-0000-4000-8000-000000000007', 'mariana.torres@example.com', '+57 306 777 8899', null, null, null),
  ('d0000000-0000-4000-8000-000000000008', 'felipe.herrera@example.com', '+57 307 888 9900', 'https://www.linkedin.com/in/felipe-herrera-example', null, 'candidates/d0000000-0000-4000-8000-000000000008/resume.pdf')
on conflict (candidate_id) do nothing;

insert into public.candidate_experience (candidate_id, company, title, start_date, end_date, is_current, description, sort_order)
values
  ('d0000000-0000-4000-8000-000000000001', 'Caribe Freight Group', 'Accounting Lead', '2021-03-01', null, true, 'Lead month-end close for three US subsidiaries; migrated the group to NetSuite.', 0),
  ('d0000000-0000-4000-8000-000000000001', 'Atlántico Textiles', 'Senior Accountant', '2017-02-01', '2021-02-28', false, 'Prepared consolidated statements under IFRS and US GAAP.', 1),
  ('d0000000-0000-4000-8000-000000000002', 'Independent contractor (US clients)', 'Full-stack Engineer', '2020-01-01', null, true, 'Delivered features for two US SaaS products in TypeScript, React and Node.', 0),
  ('d0000000-0000-4000-8000-000000000002', 'Globant', 'Software Engineer', '2018-06-01', '2019-12-31', false, 'Backend services in Node.js for a US retailer.', 1),
  ('d0000000-0000-4000-8000-000000000003', 'MedAssist BPO', 'Patient Support Agent', '2022-01-10', null, true, 'Scheduling and billing support for US clinics.', 0),
  ('d0000000-0000-4000-8000-000000000004', 'Rappi', 'Data Analyst', '2022-05-01', null, true, 'Dashboards and experimentation analysis for the growth team.', 0),
  ('d0000000-0000-4000-8000-000000000005', 'Cloudleads Inc.', 'Sales Development Representative', '2024-02-01', null, true, 'Outbound prospecting for a US property-tech vendor.', 0),
  ('d0000000-0000-4000-8000-000000000006', 'Founders Assist', 'Executive Assistant', '2020-09-01', null, true, 'Remote support for three US founders.', 0),
  ('d0000000-0000-4000-8000-000000000008', 'Portlink Forwarders', 'Dispatch Coordinator', '2018-04-01', null, true, 'Night-shift coordination for US inbound freight.', 0);

insert into public.candidate_education (candidate_id, institution, degree, field, start_year, end_year)
values
  ('d0000000-0000-4000-8000-000000000001', 'Universidad del Norte', 'Bachelor', 'Public Accounting', 2012, 2016),
  ('d0000000-0000-4000-8000-000000000002', 'Universidad EAFIT', 'Bachelor', 'Systems Engineering', 2013, 2018),
  ('d0000000-0000-4000-8000-000000000003', 'Universidad Autónoma del Caribe', 'Bachelor', 'Business Administration', 2016, 2021),
  ('d0000000-0000-4000-8000-000000000004', 'Universidad de los Andes', 'Bachelor', 'Industrial Engineering', 2016, 2021),
  ('d0000000-0000-4000-8000-000000000005', 'Universidad Tecnológica de Bolívar', 'Bachelor', 'International Business', 2018, 2023),
  ('d0000000-0000-4000-8000-000000000007', 'Universidad del Atlántico', 'Bachelor', 'Public Accounting', 2020, 2025),
  ('d0000000-0000-4000-8000-000000000008', 'SENA', 'Technologist', 'Logistics', 2014, 2017);

-- ---------------------------------------------------------------------------
-- Applications in different stages (status walked forward so events exist)
-- ---------------------------------------------------------------------------
insert into public.applications (id, job_id, candidate_id, status, source, cover_note, created_at)
values
  ('f0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'applied', 'candidate', 'I led month-end close for US subsidiaries for four years and migrated the group to NetSuite.', now() - interval '10 days'),
  ('f0000000-0000-4000-8000-000000000002', 'e0000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000002', 'applied', 'candidate', 'Six years shipping TypeScript products for US startups.', now() - interval '6 days'),
  ('f0000000-0000-4000-8000-000000000003', 'e0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000003', 'applied', 'candidate', null, now() - interval '8 days'),
  ('f0000000-0000-4000-8000-000000000004', 'e0000000-0000-4000-8000-000000000004', 'd0000000-0000-4000-8000-000000000004', 'applied', 'candidate', 'Happy to share dashboards from previous roles.', now() - interval '4 days'),
  ('f0000000-0000-4000-8000-000000000005', 'e0000000-0000-4000-8000-000000000006', 'd0000000-0000-4000-8000-000000000006', 'shortlisted', 'dexee_recommended', null, now() - interval '1 day')
on conflict (id) do nothing;

update public.applications set status = 'screening' where id = 'f0000000-0000-4000-8000-000000000001';
update public.applications set status = 'shortlisted' where id = 'f0000000-0000-4000-8000-000000000001';
update public.applications set status = 'interview', contact_requested_at = now() - interval '3 days',
  contact_released = true, contact_released_by = 'a0000000-0000-4000-8000-000000000001', contact_released_at = now() - interval '2 days'
  where id = 'f0000000-0000-4000-8000-000000000001';
update public.applications set status = 'screening' where id = 'f0000000-0000-4000-8000-000000000002';
update public.applications set status = 'shortlisted', contact_requested_at = now() - interval '1 day' where id = 'f0000000-0000-4000-8000-000000000002';
update public.applications set status = 'screening' where id = 'f0000000-0000-4000-8000-000000000003';

insert into public.notes (candidate_id, application_id, author_user_id, body, visibility)
values
  ('d0000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000002', 'Strong close experience. Schedule a call with the controller.', 'company'),
  ('d0000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Reference check completed with Caribe Freight: positive.', 'dexee_only'),
  ('d0000000-0000-4000-8000-000000000002', 'f0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'Contact requested by Brightline; waiting for the candidate to confirm interest.', 'dexee_only');

insert into public.saved_candidates (company_id, candidate_id, created_by)
values ('b0000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000003')
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Assessments (inactive until Phase 6 seeds the banks)
-- ---------------------------------------------------------------------------
insert into public.assessments (id, type, title, description, version, is_active, time_limit_minutes, cooldown_days, required_to_apply, config)
values
  ('aa000000-0000-4000-8000-000000000001', 'english_written', 'English written assessment', 'Grammar, vocabulary and reading (40 items) plus one writing task. 45 minutes.', 1, false, 45, 90, true,
   '{"mcq_count": 40, "band_quotas": {"band1": 14, "band2": 14, "band3": 12}, "writing_prompts": 1, "grace_seconds": 60,
     "thresholds": {"a1_overall_below": 0.20, "a2_band1_below": 0.70, "b1_band2_below": 0.55, "b2_band3_below": 0.50, "c1_band3_min": 0.50, "c1_overall_min": 0.75, "c2_band3_min": 0.80, "c2_overall_min": 0.90},
     "writing_levels": {"A2": [0, 5], "B1": [6, 9], "B2": [10, 13], "C1": [14, 17], "C2": [18, 20]}, "validation_gap_levels": 2}'),
  ('aa000000-0000-4000-8000-000000000002', 'english_oral', 'English oral assessment', 'Four recorded answers of 60 to 90 seconds, validated by Dexee.', 1, false, 30, 90, true,
   '{"prompts_per_attempt": 4, "prep_seconds": 20, "min_seconds": 60, "max_seconds": 90, "max_bytes": 3145728, "re_records": 1,
     "levels": {"A2": [0, 5], "B1": [6, 9], "B2": [10, 13], "C1": [14, 17], "C2": [18, 20]}}'),
  ('aa000000-0000-4000-8000-000000000003', 'psychometric', 'Work-style profile', 'Fifty statements about how you work plus ten remote-work situations. No time limit.', 1, false, 1440, 90, true,
   '{"factors": ["extraversion", "agreeableness", "conscientiousness", "emotional_stability", "intellect"], "items_per_factor": 10, "sjt_items": 10,
     "bands": {"low_below": 40, "high_above": 60}, "strength_sjt_min": 7}')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Notifications
-- ---------------------------------------------------------------------------
insert into public.notifications (user_id, type, title, body, link, read_at, created_at)
values
  ('c0000000-0000-4000-8000-000000000002', 'new_application', 'New application: Senior Accountant (US GAAP)', 'Laura G. applied.', '/company/jobs/e0000000-0000-4000-8000-000000000001/pipeline', now() - interval '9 days', now() - interval '10 days'),
  ('c0000000-0000-4000-8000-000000000002', 'contact_released', 'Contact details released', 'Dexee released contact details for Laura G. on Senior Accountant (US GAAP).', '/company/jobs/e0000000-0000-4000-8000-000000000001/pipeline', null, now() - interval '2 days'),
  ('a0000000-0000-4000-8000-000000000001', 'contact_requested', 'Contact details requested', 'Brightline SaaS requested contact details for Andrés P. on Full-stack Engineer (TypeScript).', '/admin/applications', null, now() - interval '1 day'),
  ('d0000000-0000-4000-8000-000000000001', 'application_status', 'Your application moved to interview', 'Harbor Health Admin moved your application for Senior Accountant (US GAAP) to interview.', '/candidate/applications', null, now() - interval '3 days'),
  ('d0000000-0000-4000-8000-000000000006', 'recommendation', 'Dexee recommended you for a role', 'You were shortlisted for Executive Assistant (part-time) at Harbor Health Admin.', '/candidate/applications', null, now() - interval '1 day');
