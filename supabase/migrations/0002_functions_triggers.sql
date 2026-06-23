-- ============================================================
-- 0002_functions_triggers.sql — Helpers, triggers, RPCs
-- ============================================================

-- ---------- updated_at maintenance ----------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['staff','categories','products','product_variants',
                           'customers','orders','delivery_zones']
  loop
    execute format(
      'create trigger trg_%s_updated before update on %I
       for each row execute function public.set_updated_at()', t, t);
  end loop;
end $$;

-- ---------- RBAC helpers (used by RLS) ----------
create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from staff s
    where s.user_id = auth.uid() and s.is_active
  );
$$;

create or replace function public.staff_role()
returns text language sql stable security definer set search_path = public as $$
  select r.name from staff s
  join roles r on r.id = s.role_id
  where s.user_id = auth.uid() and s.is_active
  limit 1;
$$;

-- ---------- Auto-create customer profile on signup ----------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.customers (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name',''))
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Audit: log every order status change ----------
create or replace function public.log_order_status()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status then
    insert into order_status_log (order_id, from_status, to_status, changed_by)
    values (new.id, old.status, new.status, auth.uid());
  end if;
  return new;
end $$;

create trigger trg_order_status_log
  after update on orders
  for each row execute function public.log_order_status();

-- ============================================================
-- STOCK RESERVATION (called server-side at checkout, atomic)
-- Locks the variant row -> no overselling under concurrency.
-- ============================================================
create or replace function public.reserve_stock(
  p_order_id uuid, p_variant_id uuid, p_qty int,
  p_ttl_minutes int default 30
) returns void language plpgsql security definer set search_path = public as $$
declare v record;
begin
  if p_qty <= 0 then raise exception 'qty must be positive'; end if;

  select stock_qty, reserved_qty into v
  from product_variants where id = p_variant_id for update;

  if not found then raise exception 'variant not found'; end if;
  if v.stock_qty - v.reserved_qty < p_qty then
    raise exception 'INSUFFICIENT_STOCK';
  end if;

  update product_variants
     set reserved_qty = reserved_qty + p_qty
   where id = p_variant_id;

  insert into stock_reservations (order_id, variant_id, qty, expires_at)
  values (p_order_id, p_variant_id, p_qty, now() + make_interval(mins => p_ttl_minutes));

  insert into stock_movements (variant_id, type, qty_change, order_id, note)
  values (p_variant_id, 'reservation', -p_qty, p_order_id, 'checkout hold');
end $$;

-- ---------- Release reservations for one order (cancel / payment failed) ----------
create or replace function public.release_order_reservations(p_order_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare r record;
begin
  for r in
    select id, variant_id, qty from stock_reservations
    where order_id = p_order_id and not released
    for update
  loop
    update product_variants
       set reserved_qty = greatest(reserved_qty - r.qty, 0)
     where id = r.variant_id;
    update stock_reservations set released = true where id = r.id;
    insert into stock_movements (variant_id, type, qty_change, order_id, note)
    values (r.variant_id, 'release', r.qty, p_order_id, 'reservation released');
  end loop;
end $$;

-- ---------- Release all expired reservations (Vercel cron hits an API route) ----------
create or replace function public.release_expired_reservations()
returns int language plpgsql security definer set search_path = public as $$
declare r record; n int := 0;
begin
  for r in
    select id, order_id, variant_id, qty from stock_reservations
    where not released and expires_at < now()
    for update skip locked
  loop
    update product_variants
       set reserved_qty = greatest(reserved_qty - r.qty, 0)
     where id = r.variant_id;
    update stock_reservations set released = true where id = r.id;
    insert into stock_movements (variant_id, type, qty_change, order_id, note)
    values (r.variant_id, 'release', r.qty, r.order_id, 'reservation expired');
    n := n + 1;
  end loop;
  return n;
end $$;

-- ============================================================
-- CONFIRM PAYMENT (called ONLY from PayHere webhook handler
-- using the service role after md5sig verification).
-- Converts reservations into real stock decrements, atomically.
-- ============================================================
create or replace function public.confirm_order_paid(
  p_order_id uuid, p_payhere_payment_id text, p_payhere_method text default null
) returns void language plpgsql security definer set search_path = public as $$
declare r record; v_status order_status;
begin
  select status into v_status from orders where id = p_order_id for update;
  if not found then raise exception 'order not found'; end if;
  if v_status <> 'pending' then return; end if;   -- idempotent: webhook retries are safe

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
end $$;

-- ---------- Coupon validation (storefront calls this; table itself is staff-only) ----------
create or replace function public.validate_coupon(p_code text, p_subtotal numeric)
returns table (coupon_id uuid, code citext, type discount_type, value numeric)
language plpgsql stable security definer set search_path = public as $$
begin
  return query
  select c.id, c.code, c.type, c.value
  from coupons c
  where c.code = p_code::citext
    and c.is_active
    and c.starts_at <= now()
    and (c.ends_at is null or c.ends_at > now())
    and (c.max_uses is null or c.used_count < c.max_uses)
    and p_subtotal >= c.min_order_total
    and (
      auth.uid() is null or
      (select count(*) from coupon_redemptions cr
        where cr.coupon_id = c.id and cr.customer_id = auth.uid())
      < c.per_customer_limit
    );
end $$;

-- ============================================================
-- Privileged RPC lockdown: server-only functions are NOT
-- callable by browser clients (anon/authenticated).
-- ============================================================
revoke execute on function public.reserve_stock(uuid,uuid,int,int)        from anon, authenticated;
revoke execute on function public.release_order_reservations(uuid)        from anon, authenticated;
revoke execute on function public.release_expired_reservations()          from anon, authenticated;
revoke execute on function public.confirm_order_paid(uuid,text,text)      from anon, authenticated;
grant  execute on function public.validate_coupon(text,numeric)           to anon, authenticated;
