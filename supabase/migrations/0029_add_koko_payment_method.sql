-- ============================================================
-- 0029_add_koko_payment_method.sql
-- The orders_payment_method_check constraint only allowed
-- 'payhere', 'cod', 'whatsapp'. Adding 'koko' so Koko (BNPL)
-- orders can actually be inserted.
-- ============================================================

ALTER TABLE orders DROP CONSTRAINT orders_payment_method_check;
ALTER TABLE orders ADD CONSTRAINT orders_payment_method_check
  CHECK (payment_method = ANY (ARRAY['payhere'::text, 'cod'::text, 'whatsapp'::text, 'koko'::text]));
