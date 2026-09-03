-- ============================================================
-- 0030_fix_coupon_abuse_gaps.sql
-- Two coupon-abuse gaps found in a payment-flow audit:
--
-- 1. validate_coupon's per-customer-limit check was
--    `auth.uid() is null or (...)` — any unauthenticated guest
--    bypassed the limit entirely instead of being checked against
--    it. Now checks phone_norm for guests, same as for logged-in
--    customers via customer_id.
-- 2. COD/WhatsApp orders are final immediately at checkout — there
--    is no later payment-confirmation webhook to redeem/count the
--    coupon from (unlike PayHere/Koko), so max_uses and
--    per_customer_limit never applied to them at all. New
--    redeem_coupon_immediate() atomically checks+records+counts a
--    redemption at order-creation time, locking the coupon row the
--    same way reserve_stock locks a variant row.
-- ============================================================

alter table coupon_redemptions add column if not exists phone_norm text;

create or replace function public.validate_coupon(p_code text, p_subtotal numeric, p_phone text default null::text)
returns table(coupon_id uuid, code citext, type discount_type, value numeric)
language plpgsql
stable security definer
set search_path to 'public'
as $function$
declare v_phone text := norm_phone(p_phone);
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
      case
        when auth.uid() is not null then
          (select count(*) from coupon_redemptions cr
            where cr.coupon_id = c.id and cr.customer_id = auth.uid()) < c.per_customer_limit
        when v_phone is not null then
          (select count(*) from coupon_redemptions cr
            where cr.coupon_id = c.id and cr.phone_norm = v_phone) < c.per_customer_limit
        else false
      end
    )
    and (
      c.contact_id is null
      or exists (
        select 1 from contacts ct
        where ct.id = c.contact_id
          and (
            (v_phone is not null and ct.phone_norm = v_phone)
            or (auth.uid() is not null and ct.customer_id = auth.uid())
          )
      )
    );
end $function$;

create function public.redeem_coupon_immediate(p_coupon_id uuid, p_order_id uuid, p_customer_id uuid, p_phone text)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $function$
declare c record; v_phone text := norm_phone(p_phone); v_count int;
begin
  select id, max_uses, used_count, per_customer_limit into c
  from coupons where id = p_coupon_id for update;
  if not found then return false; end if;

  if c.max_uses is not null and c.used_count >= c.max_uses then return false; end if;

  if p_customer_id is not null then
    select count(*) into v_count from coupon_redemptions
      where coupon_id = p_coupon_id and customer_id = p_customer_id;
  elsif v_phone is not null then
    select count(*) into v_count from coupon_redemptions
      where coupon_id = p_coupon_id and phone_norm = v_phone;
  else
    return false;
  end if;
  if v_count >= c.per_customer_limit then return false; end if;

  insert into coupon_redemptions (coupon_id, customer_id, order_id, phone_norm)
  values (p_coupon_id, p_customer_id, p_order_id, v_phone);
  update coupons set used_count = used_count + 1 where id = p_coupon_id;
  return true;
end $function$;
