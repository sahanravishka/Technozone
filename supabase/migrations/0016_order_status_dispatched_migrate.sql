-- ============================================================
-- 0016_order_status_dispatched_migrate.sql
-- Backfills existing orders and updates every function that hard-coded
-- 'shipped' / 'delivered' in an order_status check. Run after 0015.
-- ============================================================

-- ---------- 1. Backfill existing rows ----------
update orders set status = 'dispatched' where status in ('shipped', 'delivered');

-- ---------- 2. sync_contact_from_order (0005): count dispatched as "past paid" ----------
create or replace function public.sync_contact_from_order()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_phone   text := norm_phone(new.customer_phone);
  v_email   citext := coalesce(new.guest_email,
                        (select email from customers where id = new.customer_id));
  v_name    text := coalesce(new.shipping_address->>'name',
                        (select full_name from customers where id = new.customer_id));
  v_city    text := new.shipping_address->>'city';
  v_addr    text := new.shipping_address->>'line1';
  v_contact uuid;
begin
  if new.payment_status is distinct from 'paid'
     and new.status not in ('paid','packed','dispatched') then
    return new;
  end if;

  select id into v_contact from contacts where phone_norm = v_phone limit 1;
  if v_contact is null and v_email is not null then
    select id into v_contact from contacts where email = v_email limit 1;
  end if;

  if v_contact is null then
    insert into contacts (customer_id, full_name, phone_norm, phone_display, email, city, address)
    values (new.customer_id, v_name, v_phone, new.customer_phone, v_email, v_city, v_addr)
    returning id into v_contact;
  else
    update contacts set
      customer_id = coalesce(customer_id, new.customer_id),
      full_name   = coalesce(full_name, v_name),
      email       = coalesce(email, v_email),
      city        = coalesce(v_city, city),
      address     = coalesce(v_addr, address),
      updated_at  = now()
    where id = v_contact;
  end if;

  update orders set contact_id = v_contact where id = new.id;

  update contacts c set
    orders_count   = sub.cnt,
    lifetime_value = sub.ltv,
    last_order_at  = sub.last_at,
    updated_at     = now()
  from (
    select count(*) cnt, coalesce(sum(total),0) ltv, max(created_at) last_at
    from orders
    where contact_id = v_contact
      and (payment_status = 'paid' or status in ('paid','packed','dispatched'))
  ) sub
  where c.id = v_contact;

  return new;
end;
$$;

-- ---------- 3. request_return (0008): allow returns once dispatched/paid/packed ----------
create or replace function public.request_return(
  p_order_number text, p_phone text, p_reason text)
returns text language plpgsql security definer set search_path = public as $$
declare v_order orders%rowtype; v_rma uuid; v_num text;
begin
  select * into v_order from orders
   where order_number = p_order_number
     and right(regexp_replace(customer_phone,'\D','','g'),4) = right(regexp_replace(p_phone,'\D','','g'),4)
     and status in ('dispatched','paid','packed');
  if not found then return null; end if;

  insert into returns (order_id, customer_name, customer_phone, reason)
  values (v_order.id, v_order.shipping_address->>'name', v_order.customer_phone, p_reason)
  returning id, rma_number into v_rma, v_num;

  insert into return_items (return_id, order_item_id, variant_id, product_name, qty)
  select v_rma, oi.id, oi.variant_id, oi.product_name, oi.qty from order_items oi where oi.order_id = v_order.id;

  return v_num;
end; $$;
