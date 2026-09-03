-- ============================================================
-- 0031_confirm_order_paid_koko_returns_transitioned.sql
-- confirm_order_paid_koko() was correctly idempotent (locks the
-- order row, no-ops if it's not still pending) but returned void,
-- so callers couldn't tell a genuine transition from a replay
-- hitting an already-paid order. Both the response webhook and the
-- reconcile fallback fired a staff Telegram alert unconditionally
-- on any SUCCESS, so a webhook retry or a race between concurrent
-- reconcile calls (customer auto-refresh + admin recheck button)
-- could double-alert staff. Now returns whether it actually paid
-- the order.
-- ============================================================

drop function if exists public.confirm_order_paid_koko(text, text);

create function public.confirm_order_paid_koko(p_koko_order_id text, p_koko_txn_id text)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $function$
declare r record; v_order_id uuid; v_status order_status;
begin
  select id, status into v_order_id, v_status from orders
    where koko_order_id = p_koko_order_id for update;
  if not found then raise exception 'order not found for koko_order_id %', p_koko_order_id; end if;
  if v_status <> 'pending' then return false; end if;

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

  update coupons c
     set used_count = used_count + 1
    from orders o
   where o.id = v_order_id and o.coupon_id = c.id;

  return true;
end $function$;
