-- Phase 10: a fourth free assessment, an original DISC-style work profile.
-- Alone in its own file on purpose: a new enum value cannot be used in the same transaction
-- that adds it, and the verification harness runs each file as one transaction.
alter type public.assessment_type add value if not exists 'disc';
