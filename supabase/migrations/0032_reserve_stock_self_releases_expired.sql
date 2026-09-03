-- ============================================================
-- 0032_reserve_stock_self_releases_expired.sql
-- Stock reservations expire after 30 minutes, but the only thing
-- that released expired ones was a once-a-day cron
-- (release_expired_reservations, /api/cron/release-reservations —
-- Vercel Hobby-tier crons can't run more often than daily). An
-- abandoned PayHere/Koko checkout could hold real stock hostage for
-- up to ~24 hours after its reservation genuinely expired, wrongly
-- blocking a real sale of in-stock items.
--
-- reserve_stock() now reclaims that same variant's own expired,
-- unreleased reservations under its existing row lock before
-- checking availability — self-healing at the moment it matters
-- (the next real checkout attempt) instead of depending on cron
-- cadence. The daily cron stays as a backstop for variants nobody
-- tries to buy again.
-- ============================================================

create or replace function public.reserve_stock(p_order_id uuid, p_variant_id uuid, p_qty integer, p_ttl_minutes integer default 30)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v record; r record;
begin
  if p_qty <= 0 then raise exception 'qty must be positive'; end if;

  select stock_qty, reserved_qty into v
  from product_variants where id = p_variant_id for update;

  if not found then raise exception 'variant not found'; end if;

  for r in
    select id, order_id, qty from stock_reservations
    where variant_id = p_variant_id and not released and expires_at < now()
    for update skip locked
  loop
    v.reserved_qty := greatest(v.reserved_qty - r.qty, 0);
    update stock_reservations set released = true where id = r.id;
    insert into stock_movements (variant_id, type, qty_change, order_id, note)
    values (p_variant_id, 'release', r.qty, r.order_id, 'reservation expired (reclaimed at checkout)');
  end loop;

  if v.stock_qty - v.reserved_qty < p_qty then
    raise exception 'INSUFFICIENT_STOCK';
  end if;

  update product_variants
     set reserved_qty = v.reserved_qty + p_qty
   where id = p_variant_id;

  insert into stock_reservations (order_id, variant_id, qty, expires_at)
  values (p_order_id, p_variant_id, p_qty, now() + make_interval(mins => p_ttl_minutes));

  insert into stock_movements (variant_id, type, qty_change, order_id, note)
  values (p_variant_id, 'reservation', -p_qty, p_order_id, 'checkout hold');
end $function$;
