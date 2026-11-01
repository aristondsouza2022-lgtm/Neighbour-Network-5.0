begin;
-- These functions are implementation details, not anonymous RPC endpoints.
revoke all on function public.is_pending_join_request_for_current_apartment(uuid) from public, anon;
grant execute on function public.is_pending_join_request_for_current_apartment(uuid) to authenticated;

revoke all on function public.submit_apartment_join_request(uuid,text) from public, anon;
grant execute on function public.submit_apartment_join_request(uuid,text) to authenticated;

revoke all on function public.review_apartment_join_request(uuid,boolean) from public, anon;
grant execute on function public.review_apartment_join_request(uuid,boolean) to authenticated;

-- Trigger-only functions must never be directly callable through PostgREST.
revoke all on function public.prevent_self_tenant_or_role_change() from public, anon, authenticated;
revoke all on function public.sync_emergency_notification() from public, anon, authenticated;
commit;