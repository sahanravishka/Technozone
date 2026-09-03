-- ============================================================
-- 0033_drop_vulnerable_validate_coupon_overload.sql
-- 0030 added a p_phone parameter to validate_coupon() to close the
-- guest per-customer-limit bypass, but CREATE OR REPLACE on a
-- changed parameter list creates a new overload rather than
-- replacing the old one in place — the original 2-argument
-- validate_coupon(text, numeric), with its unfixed
-- `auth.uid() is null or (...)` bypass, stayed live and callable by
-- anon/authenticated the whole time. Any client could sidestep
-- 0030's fix entirely just by calling the RPC with only p_code and
-- p_subtotal. Only the 3-argument version is called anywhere in the
-- app, so the old one is dead weight as well as a live hole.
-- ============================================================

drop function if exists public.validate_coupon(text, numeric);
