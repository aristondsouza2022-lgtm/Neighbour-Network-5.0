-- Multi-society security, visitor privacy, SOS notifications and residence requests.
-- Applied to the linked Supabase project as:
-- secure_multisociety_visitors_sos_and_join_requests
-- harden_profile_tenant_columns_and_publish_sos_notifications

begin;

drop policy if exists visitor_select_resident_or_security on public.visitor_logs;
drop policy if exists visitor_select_private_resident_or_gate on public.visitor_logs;
create policy visitor_select_private_resident_or_gate
on public.visitor_logs for select to authenticated
using (
  resident_id = auth.uid()
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.apartment_id = visitor_logs.apartment_id
      and p.role in ('security','admin','developer')
  )
);

create or replace function public.prevent_self_tenant_or_role_change()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() = old.id and (
    new.apartment_id is distinct from old.apartment_id
    or new.role is distinct from old.role
    or new.is_verified is distinct from old.is_verified
  ) then
    raise exception 'Residence, role and verification can only be changed by an authorized approval workflow';
  end if;
  return new;
end;
$$;
drop trigger if exists profiles_prevent_self_tenant_or_role_change on public.profiles;
create trigger profiles_prevent_self_tenant_or_role_change
before update on public.profiles for each row
execute function public.prevent_self_tenant_or_role_change();

drop policy if exists profiles_update_self on public.profiles;
drop policy if exists profiles_update_self_safe on public.profiles;
create policy profiles_update_self_safe
on public.profiles for update to authenticated
using (id = auth.uid())
with check (
  id = auth.uid()
  and apartment_id = public.current_profile_apartment_id()
  and role = public.current_profile_role()
);

drop policy if exists sos_select_apartment on public.emergency_sos;
create policy sos_select_private_and_responders
on public.emergency_sos for select to authenticated
using (
  triggered_by = auth.uid()
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.apartment_id = emergency_sos.apartment_id
      and p.role in ('admin','security','developer')
  )
);

drop policy if exists sos_update_resolver on public.emergency_sos;
create policy sos_update_authorized_resolver
on public.emergency_sos for update to authenticated
using (
  triggered_by = auth.uid()
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.apartment_id = emergency_sos.apartment_id
      and p.role in ('admin','security','developer')
  )
)
with check (
  apartment_id = public.current_profile_apartment_id()
  and (
    triggered_by = auth.uid()
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.apartment_id = emergency_sos.apartment_id
        and p.role in ('admin','security','developer')
    )
  )
);

create table if not exists public.emergency_notifications (
  id uuid primary key default gen_random_uuid(),
  apartment_id uuid not null references public.apartments(id) on delete cascade,
  sos_id uuid not null references public.emergency_sos(id) on delete cascade,
  triggered_by uuid not null references public.profiles(id) on delete cascade,
  flat_no text not null default '',
  emergency_type text not null default 'Emergency',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  unique (sos_id)
);
alter table public.emergency_notifications enable row level security;
create policy emergency_notifications_same_apartment_read
on public.emergency_notifications for select to authenticated
using (apartment_id = public.current_profile_apartment_id());
create policy emergency_notifications_insert_own
on public.emergency_notifications for insert to authenticated
with check (
  triggered_by = auth.uid()
  and apartment_id = public.current_profile_apartment_id()
  and exists (select 1 from public.emergency_sos s where s.id = sos_id and s.triggered_by = auth.uid() and s.apartment_id = apartment_id)
);
create policy emergency_notifications_update_responder
on public.emergency_notifications for update to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.apartment_id = emergency_notifications.apartment_id and p.role in ('admin','security','developer')))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.apartment_id = emergency_notifications.apartment_id and p.role in ('admin','security','developer')));

create or replace function public.sync_emergency_notification()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.emergency_notifications
      (apartment_id,sos_id,triggered_by,flat_no,emergency_type,is_active,created_at)
    values
      (new.apartment_id,new.id,new.triggered_by,coalesce(new.flat_no,''),coalesce(new.emergency_type,'Emergency'),new.is_active,new.created_at)
    on conflict (sos_id) do nothing;
  else
    update public.emergency_notifications
      set is_active = new.is_active, resolved_at = new.resolved_at
      where sos_id = new.id;
  end if;
  return new;
end;
$$;
drop trigger if exists emergency_sos_sync_notification on public.emergency_sos;
create trigger emergency_sos_sync_notification
after insert or update of is_active,resolved_at on public.emergency_sos
for each row execute function public.sync_emergency_notification();

create table if not exists public.apartment_join_requests (
  id uuid primary key default gen_random_uuid(),
  apartment_id uuid not null references public.apartments(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  requested_flat_no text not null default '',
  status text not null default 'pending' check (status in ('pending','approved','rejected','cancelled')),
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (apartment_id,profile_id)
);
alter table public.apartment_join_requests enable row level security;
create policy apartment_join_requests_requester_read
on public.apartment_join_requests for select to authenticated using (profile_id = auth.uid());
create policy apartment_join_requests_target_admin_read
on public.apartment_join_requests for select to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.apartment_id = apartment_join_requests.apartment_id and p.role in ('admin','developer')));
create policy apartment_join_requests_requester_insert
on public.apartment_join_requests for insert to authenticated
with check (profile_id = auth.uid() and status = 'pending');
create policy apartment_join_requests_admin_update
on public.apartment_join_requests for update to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.apartment_id = apartment_join_requests.apartment_id and p.role in ('admin','developer')))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.apartment_id = apartment_join_requests.apartment_id and p.role in ('admin','developer')));

create or replace function public.submit_apartment_join_request(p_apartment_id uuid,p_flat_no text)
returns uuid language plpgsql security definer set search_path = public
as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not exists (select 1 from public.apartments where id = p_apartment_id) then raise exception 'Selected society does not exist'; end if;
  insert into public.apartment_join_requests(apartment_id,profile_id,requested_flat_no)
  values (p_apartment_id,auth.uid(),coalesce(p_flat_no,''))
  on conflict (apartment_id,profile_id) do update
    set requested_flat_no=excluded.requested_flat_no,status='pending',reviewed_by=null,reviewed_at=null
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.submit_apartment_join_request(uuid,text) from public;
grant execute on function public.submit_apartment_join_request(uuid,text) to authenticated;

create or replace function public.review_apartment_join_request(p_request_id uuid,p_approve boolean)
returns void language plpgsql security definer set search_path = public
as $$
declare v_req public.apartment_join_requests%rowtype;
declare v_admin public.profiles%rowtype;
begin
  select * into v_admin from public.profiles where id=auth.uid();
  if v_admin.id is null or v_admin.role not in ('admin','developer') then raise exception 'Only an administrator can review joining requests'; end if;
  select * into v_req from public.apartment_join_requests where id=p_request_id for update;
  if v_req.id is null then raise exception 'Joining request not found'; end if;
  if v_admin.role <> 'developer' and v_admin.apartment_id <> v_req.apartment_id then raise exception 'You cannot review requests for another society'; end if;
  if v_req.status <> 'pending' then raise exception 'Request is no longer pending'; end if;
  update public.apartment_join_requests set status=case when p_approve then 'approved' else 'rejected' end,reviewed_by=auth.uid(),reviewed_at=now() where id=p_request_id;
  if p_approve then
    update public.profiles set apartment_id=v_req.apartment_id,flat_no=v_req.requested_flat_no,is_verified=true where id=v_req.profile_id;
  end if;
end;
$$;
revoke all on function public.review_apartment_join_request(uuid,boolean) from public;
grant execute on function public.review_apartment_join_request(uuid,boolean) to authenticated;

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='emergency_notifications') then
    alter publication supabase_realtime add table public.emergency_notifications;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='apartment_join_requests') then
    alter publication supabase_realtime add table public.apartment_join_requests;
  end if;
end $$;

commit;
