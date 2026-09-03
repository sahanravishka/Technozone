-- ============================================================
-- 0034_confirm_order_paid_returns_transitioned.sql
-- Same fix as 0031 (confirm_order_paid_koko), applied to PayHere's
-- confirm_order_paid(): now returns whether this call actually
-- transitioned the order to paid, vs. a no-op replay of an
-- already-paid one, so the webhook route can send the staff
-- notification exactly once per real payment instead of on every
-- retry.
-- ============================================================

drop function if exists public.confirm_order_paid(uuid, text, text);

create function public.confirm_order_paid(p_order_id uuid, p_payhere_payment_id text, p_payhere_method text default null::text)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $function$
declare r record; v_status order_status;
begin
  select status into v_status from orders where id = p_order_id for update;
  if not found then raise exception 'order not found'; end if;
  if v_status <> 'pending' then return false; end if;   -- idempotent: webhook retries are safe

  for r in
    select id, variant_id, qty from stock_reservations
    where order_id = p_order_id and not released
    for update
  loop
    update product_variants
       set stock_qty    = stock_qty - r.qty,
           reserved_qty = greatest(reserved_qty - r.qty, 0)
     where id = r.variant_id;
    update stock_reservations set released = true where id = r.id;
    insert into stock_movements (variant_id, type, qty_change, order_id, note)
    values (r.variant_id, 'sale', -r.qty, p_order_id, 'paid via PayHere');
  end loop;

  update orders
     set status = 'paid',
         payment_status = 'paid',
         payhere_payment_id = p_payhere_payment_id,
         payhere_method = coalesce(p_payhere_method, payhere_method)
   where id = p_order_id;

  -- count coupon usage exactly once, on successful payment
  update coupons c
     set used_count = used_count + 1
    from orders o
   where o.id = p_order_id and o.coupon_id = c.id;

  return true;
end $function$;

revoke execute on function public.confirm_order_paid(uuid,text,text) from anon, authenticated;
