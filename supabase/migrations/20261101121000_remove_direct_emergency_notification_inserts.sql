-- Emergency notifications are created only by the trusted trigger attached
-- to emergency_sos. Clients may read their society's minimal alert records,
-- but must not be able to create arbitrary/fake notification rows.
begin;
drop policy if exists emergency_notifications_insert_own on public.emergency_notifications;
commit;
