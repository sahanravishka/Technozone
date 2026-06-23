-- ============================================================================
-- 0008  Warranty tracking · Courier/shipment tracking · Returns (RMA)
--       · COD fraud controls
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. WARRANTIES — register a serial/IMEI against a purchase; track expiry;
--    link into repairs. Public lookup is phone- or serial-gated.
-- ---------------------------------------------------------------------------
create table warranties (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid references orders(id) on delete set null,
  product_id    uuid references products(id) on delete set null,
  contact_id    uuid references contacts(id),
  product_name  text not null,
  serial_no     text not null,                 -- serial / IMEI
  customer_name text,
  customer_phone text not null,
  purchase_date date not null default current_date,
  period_months int  not null default 12,
  expires_at    date generated always as ((purchase_date + make_interval(months => period_months))::date) stored,
  status        text not null default 'active' check (status in ('active','void')),
  notes         text,
  created_by    uuid references auth.users(id),
  created_at    timestamptz not null default now()
);
create unique index on warranties (lower(serial_no));
create index on warranties (customer_phone);

-- link a warranty to its contact by phone
create or replace function public.warranty_link_contact()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_phone text := norm_phone(new.customer_phone); v_contact uuid;
begin
  if new.contact_id is null then
    select id into v_contact from contacts where phone_norm = v_phone limit 1;
    if v_contact is null then
      insert into contacts (full_name, phone_norm, phone_display)
      values (new.customer_name, v_phone, new.customer_phone) returning id into v_contact;
    end if;
    update warranties set contact_id = v_contact where id = new.id;
  end if;
  return new;
end; $$;
create trigger trg_warranty_contact after insert on warranties
  for each row execute function public.warranty_link_contact();

-- public lookup: by serial, or by phone (last 4)
create or replace function public.lookup_warranty(p_serial text default null, p_phone_last4 text default null)
returns table (product_name text, serial_no text, purchase_date date, expires_at date,
               status text, active boolean) language sql security definer set search_path = public stable as $$
  select w.product_name, w.serial_no, w.purchase_date, w.expires_at, w.status,
         (w.status = 'active' and w.expires_at >= current_date) as active
  from warranties w
  where (p_serial   is not null and lower(w.serial_no) = lower(p_serial))
     or (p_phone_last4 is not null and right(regexp_replace(w.customer_phone,'\D','','g'),4) = p_phone_last4)
  order by w.created_at desc limit 25;
$$;
grant execute on function public.lookup_warranty(text,text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. COURIERS + SHIPMENTS — assign a courier & tracking number to an order;
--    track status; customer gets a tracking link. Provider-agnostic: works
--    manually today, API adapters slot in later (lib/courier.ts).
-- ---------------------------------------------------------------------------
create table couriers (
  id        uuid primary key default gen_random_uuid(),
  name      text not null,
  code      text not null unique,            -- koombiyo | pronto | domex | aramex | manual
  track_url_template text,                   -- e.g. https://koombiyo.lk/track/{tracking}
  is_active boolean not null default true,
  sort_order int not null default 0
);

create type shipment_status as enum
  ('label_created','picked_up','in_transit','out_for_delivery','delivered','returned','failed');

create table shipments (
  id              uuid primary key default gen_random_uuid(),
  order_id        uuid not null references orders(id) on delete cascade,
  courier_id      uuid references couriers(id),
  courier_code    text,
  tracking_number text,
  status          shipment_status not null default 'label_created',
  last_synced_at  timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index on shipments (order_id);
create index on shipments (tracking_number);

insert into couriers (name, code, track_url_template, sort_order) values
  ('Koombiyo Delivery', 'koombiyo', 'https://koombiyodelivery.lk/track/{tracking}', 1),
  ('Pronto Lanka',      'pronto',   null, 2),
  ('Domex',             'domex',    'https://www.domex.lk/track?n={tracking}', 3),
  ('Aramex',            'aramex',   'https://www.aramex.com/track/results?ShipmentNumber={tracking}', 4),
  ('Hand delivery / other', 'manual', null, 9);

-- ---------------------------------------------------------------------------
-- 3. RETURNS (RMA) — customer requests a return on a delivered order; staff
--    approve → receive → refund. Receiving with restock puts stock back.
-- ---------------------------------------------------------------------------
create sequence rma_number_seq start 100;
create type rma_status as enum ('requested','approved','received','refunded','rejected');

create table returns (
  id            uuid primary key default gen_random_uuid(),
  rma_number    text not null unique default ('RMA-' || lpad(nextval('rma_number_seq')::text,5,'0')),
  order_id      uuid not null references orders(id) on delete cascade,
  contact_id    uuid references contacts(id),
  customer_name text,
  customer_phone text not null,
  reason        text,
  status        rma_status not null default 'requested',
  refund_amount numeric(12,2),
  restock       boolean not null default true,
  resolution    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index on returns (status);

create table return_items (
  id           uuid primary key default gen_random_uuid(),
  return_id    uuid not null references returns(id) on delete cascade,
  order_item_id uuid references order_items(id),
  variant_id   uuid references product_variants(id),
  product_name text not null,
  qty          int not null check (qty > 0)
);

create table return_status_log (
  id        uuid primary key default gen_random_uuid(),
  return_id uuid not null references returns(id) on delete cascade,
  from_status rma_status, to_status rma_status not null,
  changed_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

-- log transitions; on 'received' with restock, return units to inventory
create or replace function public.return_after_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare it record;
begin
  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    insert into return_status_log (return_id, from_status, to_status, changed_by)
    values (new.id, old.status, new.status, auth.uid());

    -- restock once, when the goods are received back
    if new.status = 'received' and new.restock then
      for it in select variant_id, qty from return_items where return_id = new.id and variant_id is not null loop
        update product_variants set stock_qty = stock_qty + it.qty where id = it.variant_id;
        insert into stock_movements (variant_id, type, qty_change, order_id, note)
        values (it.variant_id, 'restock', it.qty, new.order_id, 'RMA ' || new.rma_number);
      end loop;
    end if;
  end if;
  return new;
end; $$;
create trigger trg_return_change after update on returns
  for each row execute function public.return_after_change();

-- link return to contact on insert (by phone)
create or replace function public.return_link_contact()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_contact uuid;
begin
  if new.contact_id is null then
    select id into v_contact from contacts where phone_norm = norm_phone(new.customer_phone) limit 1;
    update returns set contact_id = v_contact where id = new.id;
  end if;
  return new;
end; $$;
create trigger trg_return_contact after insert on returns
  for each row execute function public.return_link_contact();

-- public: request a return for an order (order number + phone gated)
create or replace function public.request_return(
  p_order_number text, p_phone text, p_reason text)
returns text language plpgsql security definer set search_path = public as $$
declare v_order orders%rowtype; v_rma uuid; v_num text;
begin
  select * into v_order from orders
   where order_number = p_order_number
     and right(regexp_replace(customer_phone,'\D','','g'),4) = right(regexp_replace(p_phone,'\D','','g'),4)
     and status in ('delivered','shipped','paid','packed');
  if not found then return null; end if;

  insert into returns (order_id, customer_name, customer_phone, reason)
  values (v_order.id, v_order.shipping_address->>'name', v_order.customer_phone, p_reason)
  returning id, rma_number into v_rma, v_num;

  -- copy order lines as suggested return items
  insert into return_items (return_id, order_item_id, variant_id, product_name, qty)
  select v_rma, oi.id, oi.variant_id, oi.product_name, oi.qty from order_items oi where oi.order_id = v_order.id;

  return v_num;
end; $$;
grant execute on function public.request_return(text,text,text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. COD FRAUD CONTROLS — blocklist + value cap (settings via feature_flags).
-- ---------------------------------------------------------------------------
create table cod_blocklist (
  phone_norm text primary key,
  reason     text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

-- COD config lives in feature_flags('cod'): payload { max_value }
insert into feature_flags (key, is_enabled, payload)
values ('cod', true, '{"max_value": 150000}')
on conflict (key) do nothing;

-- one call the checkout uses to gate a COD order
create or replace function public.cod_allowed(p_phone text, p_total numeric)
returns table (allowed boolean, reason text) language plpgsql security definer set search_path = public stable as $$
declare v_phone text := norm_phone(p_phone); v_max numeric;
begin
  if exists (select 1 from cod_blocklist where phone_norm = v_phone) then
    return query select false, 'blocked'; return;
  end if;
  select coalesce((payload->>'max_value')::numeric, 1e12) into v_max from feature_flags where key='cod';
  if p_total > coalesce(v_max, 1e12) then
    return query select false, 'over_limit'; return;
  end if;
  return query select true, null::text;
end; $$;
grant execute on function public.cod_allowed(text,numeric) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5. RLS
-- ---------------------------------------------------------------------------
alter table warranties        enable row level security;
alter table couriers          enable row level security;
alter table shipments         enable row level security;
alter table returns           enable row level security;
alter table return_items      enable row level security;
alter table return_status_log enable row level security;
alter table cod_blocklist     enable row level security;

-- warranties: staff manage; public uses lookup_warranty RPC (no direct select)
create policy warranties_staff on warranties for all using (is_staff()) with check (is_staff());
-- couriers: public can read active (to show names/links); staff manage
create policy couriers_read on couriers for select using (is_active or is_staff());
create policy couriers_staff on couriers for all using (is_staff()) with check (is_staff());
-- shipments: staff only (customer sees status via their order page join)
create policy shipments_staff on shipments for all using (is_staff()) with check (is_staff());
-- returns: staff manage; public uses request_return RPC
create policy returns_staff on returns for all using (is_staff()) with check (is_staff());
create policy return_items_staff on return_items for all using (is_staff()) with check (is_staff());
create policy return_log_staff on return_status_log for select using (is_staff());
-- cod blocklist: staff only
create policy cod_blocklist_staff on cod_blocklist for all using (is_staff()) with check (is_staff());
