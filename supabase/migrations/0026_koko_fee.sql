-- ============================================================
-- 0026_koko_fee.sql
-- Koko (Sri Lankan BNPL) payment method. Adds a dedicated koko_fee column
-- so the 12% merchant service fee is transparently accounted for
-- separately from subtotal/delivery_fee/discount_total, matching the
-- existing pattern for order pricing breakdown.
--
-- IMPORTANT: this fee is Techno Zone Lanka's own merchant-service
-- surcharge being passed through to the customer — Koko's own consumer
-- marketing is "always interest-free, no fees when you pay on time."
-- Never label this fee "interest" anywhere in code, UI copy, or customer
-- messaging; call it a "Koko service fee" to stay accurate.
--
-- No real Koko merchant API/webhook is connected yet — orders paid via
-- Koko are created the same way COD/WhatsApp orders are (pending until
-- staff confirm collection), not via an automated redirect+webhook like
-- PayHere. Wire up a real integration once merchant credentials exist.
-- ============================================================

alter table orders add column if not exists koko_fee numeric not null default 0;
