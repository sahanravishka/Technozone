-- ============================================================================
-- 0007  In-store pickup (fulfillment mode) + coupon-binding hardening
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Fulfillment: deliver to address, or collect in store.
--    Pickup orders have no delivery fee and need no address.
-- ---------------------------------------------------------------------------
alter table orders add column fulfillment text not null default 'delivery'
  check (fulfillment in ('delivery','pickup'));

-- ---------------------------------------------------------------------------
-- 2. Harden validate_coupon: a coupon bound to a specific contact
--    (personalized loyalty offers) is only valid for that person.
--    p_phone lets guests be matched by normalized phone; account holders
--    are matched by their linked contact too.
-- ---------------------------------------------------------------------------
create or replace function public.validate_coupon(
  p_code text, p_subtotal numeric, p_phone text default null)
returns table (coupon_id uuid, code citext, type discount_type, value numeric)
language plpgsql stable security definer set search_path = public as $$
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
      auth.uid() is null or
      (select count(*) from coupon_redemptions cr
        where cr.coupon_id = c.id and cr.customer_id = auth.uid())
      < c.per_customer_limit
    )
    -- personalized coupons: must match the bound contact (by phone or account)
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
end $$;
grant execute on function public.validate_coupon(text,numeric,text) to anon, authenticated;
