-- ============================================================================
-- 0009  Dispatch serial scanning · per-product warranty period · auto loyalty
--
--   Builds on 0005 (contacts, loyalty_tier, issue_loyalty_coupon, norm_phone)
--   and 0008 (warranties, shipments). Run AFTER both.
--
--   Adds:
--     1. products.warranty_months           — warranty period chosen per product
--     2. order_item_serials                  — serial/IMEI captured at dispatch,
--                                              linked to order + customer mobile
--     3. dispatch_scan_serial(...) RPC       — one scan → registers warranty
--        (auto period from the product) AND activates a loyalty discount coupon
--        on the customer's mobile for their next order.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Per-product warranty period (auto-fills the warranty on dispatch)
-- ---------------------------------------------------------------------------
alter table products add column if not exists warranty_months int not null default 12;

-- ---------------------------------------------------------------------------
-- 2. Serial/IMEI capture per dispatched unit — traceability + warranty link
-- ---------------------------------------------------------------------------
create table if not exists order_item_serials (
  id             uuid primary key default gen_random_uuid(),
  order_id       uuid not null references orders(id) on delete cascade,
  order_item_id  uuid references order_items(id) on delete set null,
  variant_id     uuid references product_variants(id),
  product_id     uuid references products(id),
  product_name   text not null,
  serial_no      text not null,
  customer_phone text not null,
  warranty_id    uuid references warranties(id) on delete set null,
  scanned_by     uuid references auth.users(id),
  created_at     timestamptz not null default now()
);
create unique index if not exists order_item_serials_serial_uk on order_item_serials (lower(serial_no));
create index if not exists order_item_serials_order_ix on order_item_serials (order_id);

alter table order_item_serials enable row level security;
create policy order_item_serials_staff on order_item_serials
  for all using (is_staff()) with check (is_staff());

-- ---------------------------------------------------------------------------
-- 3. Dispatch scan: serial -> warranty (auto period) + loyalty discount
--    Returns a JSON summary the admin UI shows to the packer.
-- ---------------------------------------------------------------------------
create or replace function public.dispatch_scan_serial(
  p_order_id uuid, p_serial text, p_variant_id uuid default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_order    orders%rowtype;
  v_variant  product_variants%rowtype;
  v_product  products%rowtype;
  v_pname    text;
  v_months   int  := 12;
  v_warranty uuid;
  v_expires  date;
  v_phone    text;
  v_contact  uuid;
  v_orders   int;
  v_ltv      numeric;
  v_tier     text;
  v_pct      numeric := 0;
  v_coupon   text;
begin
  if not is_staff() then raise exception 'forbidden'; end if;
  if coalesce(btrim(p_serial), '') = '' then raise exception 'serial required'; end if;

  select * into v_order from orders where id = p_order_id;
  if not found then raise exception 'order not found'; end if;

  -- resolve product (for the name + warranty period) from the scanned line's variant
  if p_variant_id is not null then
    select * into v_variant from product_variants where id = p_variant_id;
    if found then
      select * into v_product from products where id = v_variant.product_id;
      v_pname  := v_product.name;
      v_months := coalesce(v_product.warranty_months, 12);
    end if;
  end if;
  v_pname := coalesce(v_pname, 'Unit');

  -- a serial can only be registered once
  if exists (select 1 from warranties where lower(serial_no) = lower(p_serial))
     or exists (select 1 from order_item_serials where lower(serial_no) = lower(p_serial)) then
    raise exception 'serial % already registered', p_serial;
  end if;

  -- 3a. register the warranty with the product's own period
  insert into warranties (order_id, product_id, product_name, serial_no,
                          customer_name, customer_phone, period_months)
  values (p_order_id, v_product.id, v_pname, btrim(p_serial),
          v_order.shipping_address->>'name', v_order.customer_phone, v_months)
  returning id, expires_at into v_warranty, v_expires;

  -- 3b. traceability: serial <-> order <-> mobile
  insert into order_item_serials (order_id, variant_id, product_id, product_name,
                                  serial_no, customer_phone, warranty_id, scanned_by)
  values (p_order_id, p_variant_id, v_product.id, v_pname,
          btrim(p_serial), v_order.customer_phone, v_warranty, auth.uid());

  -- 3c. activate a loyalty discount on this mobile for the next order.
  -- the warranty insert above already linked/created the contact (trigger),
  -- so the lookup here always resolves.
  v_phone := norm_phone(v_order.customer_phone);
  select id, orders_count, lifetime_value
    into v_contact, v_orders, v_ltv
    from contacts where phone_norm = v_phone limit 1;

  if v_contact is not null then
    v_tier := loyalty_tier(coalesce(v_orders, 0), coalesce(v_ltv, 0));
    v_pct  := case v_tier
                when 'vip'     then 10
                when 'gold'    then 7
                when 'regular' then 5
                else 0 end;
    if v_pct > 0 then
      v_coupon := issue_loyalty_coupon(v_contact, 'percentage', v_pct, 90);
    end if;
  end if;

  return jsonb_build_object(
    'product_name',        v_pname,
    'serial_no',           btrim(p_serial),
    'warranty_expires_at', v_expires,
    'period_months',       v_months,
    'tier',                v_tier,
    'discount_pct',        v_pct,
    'coupon_code',         v_coupon
  );
end; $$;

grant execute on function public.dispatch_scan_serial(uuid, text, uuid) to authenticated;
