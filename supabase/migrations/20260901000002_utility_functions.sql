-- Generic utilities

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.slugify(input text)
returns text
language sql
immutable
set search_path = public
as $$
  select trim(both '-' from regexp_replace(
    lower(translate(coalesce(input, ''),
      'áàäâãåéèëêíìïîóòöôõúùüûñçÁÀÄÂÃÅÉÈËÊÍÌÏÎÓÒÖÔÕÚÙÜÛÑÇ',
      'aaaaaaeeeeiiiiooooouuuuncAAAAAAEEEEIIIIOOOOOUUUUNC')),
    '[^a-z0-9]+', '-', 'g'));
$$;

-- CEFR helpers: order levels so "lower of two" can be computed
create or replace function public.cefr_rank(level public.cefr_level)
returns int
language sql
immutable
as $$
  select case level
    when 'A1' then 1 when 'A2' then 2 when 'B1' then 3
    when 'B2' then 4 when 'C1' then 5 when 'C2' then 6 end;
$$;

create or replace function public.cefr_min(a public.cefr_level, b public.cefr_level)
returns public.cefr_level
language sql
immutable
as $$
  select case
    when a is null then b
    when b is null then a
    when public.cefr_rank(a) <= public.cefr_rank(b) then a
    else b end;
$$;
