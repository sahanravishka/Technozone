-- ============================================================
-- 0028_fix_public_execute_privilege_leak.sql
--
-- SECURITY FIX (found while adding the Koko integration, applied live on
-- 2026-09-01 — this file records what was already applied).
--
-- Every "revoke execute on function ... from anon, authenticated" written
-- in this codebase's history was ineffective. PostgreSQL grants EXECUTE
-- to PUBLIC by default the moment a function is created, and anon /
-- authenticated inherit that through PUBLIC membership regardless of a
-- role-specific revoke — you must revoke from PUBLIC directly, or the
-- role-specific revoke does nothing.
--
-- Verified exploitable before this fix (via has_function_privilege, not
-- just reading the grants table, which can look misleading):
--   - anon could call confirm_order_paid(...) directly — mark ANY
--     pending order as paid and convert its stock reservation into a
--     real stock deduction, with no actual payment and no signature
--     check, using nothing but the public anon key already embedded in
--     the site's client-side JS.
--   - anon could call reserve_stock(...) directly with an arbitrary
--     variant_id/qty and a fake order_id (never validated) — a
--     stock-exhaustion denial-of-service against the storefront.
--   - dispatch_scan_serial / issue_loyalty_coupon / mark_order_collected
--     were NOT exploitable in practice (each has its own internal
--     is_staff() check), but issue_loyalty_coupon and dispatch_scan_serial
--     additionally had explicit direct grants to anon/authenticated on
--     top of the PUBLIC leak — removed as defense-in-depth so security
--     doesn't rely solely on the internal check.
--
-- Confirmed after the fix: anon/authenticated get false on every
-- function below; service_role (used by every legitimate server-side
-- caller — checkout actions, payment webhooks, admin actions, all via
-- getAdminSupabase()) is completely unaffected.
-- ============================================================

revoke execute on function public.confirm_order_paid(uuid,text,text)      from public;
revoke execute on function public.confirm_order_paid_koko(text,text)      from public;
revoke execute on function public.reserve_stock(uuid,uuid,int,int)        from public;
revoke execute on function public.release_order_reservations(uuid)        from public;
revoke execute on function public.release_expired_reservations()          from public;
revoke execute on function public.dispatch_scan_serial(uuid,text,uuid)    from public;
revoke execute on function public.issue_loyalty_coupon(uuid,text,numeric,int) from public;
revoke execute on function public.mark_order_collected(uuid)              from public;

-- These two additionally had explicit direct grants beyond the PUBLIC
-- default (not just inherited) — revoke those too.
revoke execute on function public.dispatch_scan_serial(uuid,text,uuid) from anon, authenticated;
revoke execute on function public.issue_loyalty_coupon(uuid,text,numeric,int) from anon, authenticated;
