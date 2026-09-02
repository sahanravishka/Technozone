-- ============================================================
-- 0027_koko_payment_integration.sql
-- Real Koko (BNPL) payment integration, following the exact same
-- architecture as PayHere: sign a redirect form server-side, confirm via
-- a signed server-to-server response webhook. This does NOT touch
-- confirm_order_paid (PayHere's function) — a dedicated
-- confirm_order_paid_koko mirrors its logic exactly but tracks
-- koko_order_id/koko_txn_id instead, so the tested PayHere path has zero
-- regression risk.
-- ============================================================

alter table orders add column if not exists koko_order_id text;
alter table orders add column if not exists koko_txn_id text;

create unique index if not exists idx_orders_koko_order_id
  on orders (koko_order_id) where koko_order_id is not null;

-- Mirrors confirm_order_paid exactly (idempotent stock-reservation
-- conversion + coupon counting), but looks the order up by koko_order_id
-- since that's the only identifier Koko's webhook gives us back, and
-- stores koko_txn_id instead of a payhere_payment_id.
create or replace function public.confirm_order_paid_koko(
  p_koko_order_id text, p_koko_txn_id text
) returns void language plpgsql security definer set search_path = public as $$
declare r record; v_order_id uuid; v_status order_status;
begin
  select id, status into v_order_id, v_status from orders
    where koko_order_id = p_koko_order_id for update;
  if not found then raise exception 'order not found for koko_order_id %', p_koko_order_id; end if;
  if v_status <> 'pending' then return; end if;   -- idempotent: webhook retries are safe

  for r in
    select id, variant_id, qty from stock_reservations
    where order_id = v_order_id and not released
    for update
  loop
    update product_variants
       set stock_qty    = stock_qty - r.qty,
           reserved_qty = greatest(reserved_qty - r.qty, 0)
     where id = r.variant_id;
    update stock_reservations set released = true where id = r.id;
    insert into stock_movements (variant_id, type, qty_change, order_id, note)
    values (r.variant_id, 'sale', -r.qty, v_order_id, 'paid via Koko');
  end loop;

  update orders
     set status = 'paid',
         payment_status = 'paid',
         koko_txn_id = p_koko_txn_id
   where id = v_order_id;

  -- count coupon usage exactly once, on successful payment
  update coupons c
     set used_count = used_count + 1
    from orders o
   where o.id = v_order_id and o.coupon_id = c.id;
end $$;

revoke execute on function public.confirm_order_paid_koko(text,text) from anon, authenticated;
