-- ============================================================
-- 0015_order_status_dispatched.sql
-- Adds 'dispatched' to order_status. Simplified flow:
--   pending -> paid -> packed -> dispatched (final) | cancelled | refunded
-- 'shipped' and 'delivered' are retired in favour of a single
-- "dispatched" terminal step (this business hands off to the courier
-- and doesn't track separate delivery confirmation).
--
-- NOTE: Postgres forbids using a freshly-added enum value in the same
-- transaction it was added in, so the backfill + function updates live
-- in the follow-up migration (0016).
-- ============================================================

alter type order_status add value if not exists 'dispatched';
