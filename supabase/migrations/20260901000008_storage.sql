-- Storage buckets and policies (SPEC 8)

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('logos', 'logos', true, 2097152, array['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']),
  ('resumes', 'resumes', false, 5242880, array['application/pdf']),
  ('assessment-audio', 'assessment-audio', false, 3145728, array['audio/webm', 'audio/ogg', 'audio/mp4'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- logos: public read; write by company owners (companies/{company_id}/...) and admins
create policy logos_public_read on storage.objects for select
  using (bucket_id = 'logos');

create policy logos_owner_write on storage.objects for insert to authenticated
  with check (
    bucket_id = 'logos'
    and (storage.foldername(name))[1] = 'companies'
    and (
      public.is_admin()
      or public.is_company_owner(((storage.foldername(name))[2])::uuid)
    )
  );

create policy logos_owner_update on storage.objects for update to authenticated
  using (
    bucket_id = 'logos'
    and (storage.foldername(name))[1] = 'companies'
    and (public.is_admin() or public.is_company_owner(((storage.foldername(name))[2])::uuid))
  );

create policy logos_owner_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'logos'
    and (storage.foldername(name))[1] = 'companies'
    and (public.is_admin() or public.is_company_owner(((storage.foldername(name))[2])::uuid))
  );

-- resumes: candidates/{candidate_id}/resume.pdf; owner and admins. Companies get
-- server-generated signed URLs only when company_can_view_contact.
create policy resumes_owner_read on storage.objects for select to authenticated
  using (
    bucket_id = 'resumes'
    and (public.is_admin() or (storage.foldername(name))[2] = auth.uid()::text)
  );

create policy resumes_owner_write on storage.objects for insert to authenticated
  with check (
    bucket_id = 'resumes'
    and (storage.foldername(name))[1] = 'candidates'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

create policy resumes_owner_update on storage.objects for update to authenticated
  using (
    bucket_id = 'resumes'
    and (storage.foldername(name))[1] = 'candidates'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

create policy resumes_owner_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'resumes'
    and (public.is_admin() or (storage.foldername(name))[2] = auth.uid()::text)
  );

-- assessment audio: attempts/{attempt_id}/{question_id}.webm; write by owner while open
create policy audio_owner_read on storage.objects for select to authenticated
  using (
    bucket_id = 'assessment-audio'
    and (public.is_admin() or public.candidate_owns_attempt(((storage.foldername(name))[2])::uuid))
  );

create policy audio_owner_write on storage.objects for insert to authenticated
  with check (
    bucket_id = 'assessment-audio'
    and (storage.foldername(name))[1] = 'attempts'
    and public.attempt_is_open(((storage.foldername(name))[2])::uuid)
  );

create policy audio_owner_update on storage.objects for update to authenticated
  using (
    bucket_id = 'assessment-audio'
    and public.attempt_is_open(((storage.foldername(name))[2])::uuid)
  );
