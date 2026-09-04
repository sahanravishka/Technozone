-- ============================================================
-- 0037_record_sale_on_cod_fulfilment.sql
-- COD/WhatsApp fulfilment never took the goods out of stock.
--
-- Gateway payments (confirm_order_paid / confirm_order_paid_koko) convert
-- the checkout reservation into a real sale: stock_qty down, reserved_qty
-- released, a 'sale' row in stock_movements. mark_order_collected — the
-- equivalent step for cash-on-delivery and WhatsApp orders — only flipped
-- statuses, with the comment "reservations already taken at checkout;
-- nothing else to do here". So every COD sale left the shop physically
-- while stock_qty still counted it as on hand, and no 'sale' movement was
-- ever recorded for it.
--
-- Verified on live data before the fix: four dispatched COD/WhatsApp
-- orders, zero 'sale' movements between them; store-wide 67 reservations,
-- 21 releases, 5 sales (all orphaned from deleted orders).
--
-- record_order_sale() does that conversion, idempotently: the presence of
-- a 'sale' movement for the order is the guard, so confirming twice — or
-- confirming and then dispatching — deducts stock exactly once, and a
-- gateway order already deducted at payment confirmation is untouched. It
-- also copes with the 30-minute hold having already expired and been swept
-- by the cron: reserved_qty is then already back, so only stock_qty moves.
--
-- NOTE: this fixes behaviour from here on. It does NOT retroactively
-- adjust the historical orders that shipped without deducting — that is a
-- stock-count decision for the shop.
-- ============================================================

create or replace function public.record_order_sale(p_order_id uuid)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $function$
declare r record; v_reserved int;
begin
  if exists (select 1 from stock_movements
              where order_id = p_order_id and type = 'sale') then
    return false;
  end if;

  for r in
    select oi.variant_id, sum(oi.qty)::int as qty
      from order_items oi
     where oi.order_id = p_order_id and oi.variant_id is not null
     group by oi.variant_id
  loop
    perform 1 from product_variants where id = r.variant_id for update;

    select coalesce(sum(qty), 0)::int into v_reserved
      from stock_reservations
     where order_id = p_order_id and variant_id = r.variant_id and not released;

    update product_variants
       set stock_qty    = stock_qty - r.qty,
           reserved_qty = greatest(reserved_qty - v_reserved, 0)
     where id = r.variant_id;

    update stock_reservations set released = true
     where order_id = p_order_id and variant_id = r.variant_id and not released;

    insert into stock_movements (variant_id, type, qty_change, order_id, note)
    values (r.variant_id, 'sale', -r.qty, p_order_id, 'sold (cash on delivery / WhatsApp)');
  end loop;

  return true;
end $function$;

-- A new SECURITY DEFINER function needs BOTH revokes, and neither reliably
-- applies in the same migration as the CREATE (see 0038): PUBLIC holds the
-- Postgres default grant, and Supabase's own default privileges grant the
-- roles directly. Verified afterwards with has_function_privilege.
revoke execute on function public.record_order_sale(uuid) from public;
revoke execute on function public.record_order_sale(uuid) from anon, authenticated;

-- Same signature as before, so CREATE OR REPLACE keeps the existing grants.
create or replace function public.mark_order_collected(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_method text;
begin
  if not is_staff() then raise exception 'forbidden'; end if;

  select payment_method into v_method from orders where id = p_order_id;
  if v_method is null or v_method not in ('cod','whatsapp') then return; end if;

  update orders
     set payment_status = 'paid',
         status = case when status = 'pending' then 'paid' else status end,
         updated_at = now()
   where id = p_order_id
     and payment_method in ('cod','whatsapp');

  -- The money is in and the goods are going out: take them out of stock.
  perform record_order_sale(p_order_id);
end;
$function$;
