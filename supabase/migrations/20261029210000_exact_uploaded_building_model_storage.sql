-- Private storage and residence-scoped access for exact uploaded 3D building models.
-- Model metadata is stored in the existing public.apartments.model_3d_url and
-- public.apartments.custom_model_spec columns; no duplicate table is required.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('building-models', 'building-models', false, 104857600, null)
on conflict (id) do update
set public = false, file_size_limit = 104857600, allowed_mime_types = null;

drop policy if exists "Building models readable by residence members" on storage.objects;
create policy "Building models readable by residence members"
on storage.objects for select to authenticated
using (
  bucket_id = 'building-models'
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and (
        p.role = 'developer'
        or (
          p.apartment_id::text = (storage.foldername(name))[1]
          and (p.role = 'admin' or p.is_verified = true)
        )
      )
  )
);

drop policy if exists "Admins upload building models for their residence" on storage.objects;
create policy "Admins upload building models for their residence"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'building-models'
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and (
        p.role = 'developer'
        or (p.role = 'admin' and p.apartment_id::text = (storage.foldername(name))[1])
      )
  )
);

drop policy if exists "Admins update building models for their residence" on storage.objects;
create policy "Admins update building models for their residence"
on storage.objects for update to authenticated
using (
  bucket_id = 'building-models'
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and (
        p.role = 'developer'
        or (p.role = 'admin' and p.apartment_id::text = (storage.foldername(name))[1])
      )
  )
)
with check (
  bucket_id = 'building-models'
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and (
        p.role = 'developer'
        or (p.role = 'admin' and p.apartment_id::text = (storage.foldername(name))[1])
      )
  )
);

drop policy if exists "Admins delete building models for their residence" on storage.objects;
create policy "Admins delete building models for their residence"
on storage.objects for delete to authenticated
using (
  bucket_id = 'building-models'
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and (
        p.role = 'developer'
        or (p.role = 'admin' and p.apartment_id::text = (storage.foldername(name))[1])
      )
  )
);

drop policy if exists "Admins update their apartment building metadata" on public.apartments;
create policy "Admins update their apartment building metadata"
on public.apartments for update to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and (p.role = 'developer' or (p.role = 'admin' and p.apartment_id = apartments.id))
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and (p.role = 'developer' or (p.role = 'admin' and p.apartment_id = apartments.id))
  )
);
