-- ============================================================================
-- 0005  CRM (guest-friendly tracking + loyalty) · Reviews · Repairs/Services
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. CONTACTS — one row per real person, whether they buy as guest or signed in.
--    Matched on normalized phone first, then email. An account (customer_id)
--    can attach later without losing guest history.
-- ---------------------------------------------------------------------------
create table contacts (
  id            uuid primary key default gen_random_uuid(),
  customer_id   uuid references customers(id) on delete set null,  -- linked account, if any
  full_name     text,
  phone_norm    text unique,           -- digits only, 94-normalized (the match key)
  phone_display text,
  email         citext,
  city          text,
  address       text,
  marketing_opt_in boolean not null default true,
  -- rollups maintained by trigger
  orders_count  int           not null default 0,
  lifetime_value numeric(12,2) not null default 0,
  last_order_at timestamptz,
  first_seen_at timestamptz   not null default now(),
  created_at    timestamptz   not null default now(),
  updated_at    timestamptz   not null default now()
);
create index on contacts (email);
create index on contacts (lower(full_name));
create index on contacts (city);

-- loyalty tier is derived, never stored stale
create or replace function public.loyalty_tier(p_orders int, p_ltv numeric)
returns text language sql immutable as $$
  select case
    when p_ltv >= 300000 or p_orders >= 6 then 'vip'
    when p_ltv >= 75000  or p_orders >= 3 then 'gold'
    when p_orders >= 1                    then 'regular'
    else 'new'
  end;
$$;

-- normalize a Sri Lankan phone to 94XXXXXXXXX
create or replace function public.norm_phone(p text)
returns text language sql immutable as $$
  select case
    when p is null then null
    else regexp_replace(
           regexp_replace(p, '\D', '', 'g'),     -- strip non-digits
           '^0', '94')                            -- leading 0 -> 94
  end;
$$;

-- ---------------------------------------------------------------------------
-- 2. ORDERS become guest-friendly: customer_id optional, contact link added.
-- ---------------------------------------------------------------------------
alter table orders alter column customer_id drop not null;
alter table orders add column contact_id  uuid references contacts(id);
alter table orders add column guest_email citext;
alter table orders add column channel     text not null default 'web';  -- web | admin

-- upsert the contact + refresh rollups whenever an order becomes paid
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
  -- only count an order once it is actually paid (or later in the flow)
  if new.payment_status is distinct from 'paid'
     and new.status not in ('paid','packed','shipped','delivered') then
    return new;
  end if;

  -- find existing contact by phone, then email
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

  -- refresh rollups from all paid orders on this contact
  update contacts c set
    orders_count   = sub.cnt,
    lifetime_value = sub.ltv,
    last_order_at  = sub.last_at,
    updated_at     = now()
  from (
    select count(*) cnt, coalesce(sum(total),0) ltv, max(created_at) last_at
    from orders
    where contact_id = v_contact
      and (payment_status = 'paid' or status in ('paid','packed','shipped','delivered'))
  ) sub
  where c.id = v_contact;

  return new;
end;
$$;

create trigger trg_sync_contact
  after insert or update of status, payment_status on orders
  for each row execute function public.sync_contact_from_order();

-- ---------------------------------------------------------------------------
-- 3. REVIEWS — verified-purchase aware; staff can post on a customer's behalf.
-- ---------------------------------------------------------------------------
create table reviews (
  id           uuid primary key default gen_random_uuid(),
  product_id   uuid not null references products(id) on delete cascade,
  contact_id   uuid references contacts(id) on delete set null,
  customer_id  uuid references customers(id) on delete set null,
  author_name  text not null,
  rating       int  not null check (rating between 1 and 5),
  title        text,
  body         text,
  is_verified  boolean not null default false,   -- bought this product
  by_staff     boolean not null default false,   -- entered by shop on customer's behalf
  status       text not null default 'published' -- published | pending | hidden
                 check (status in ('published','pending','hidden')),
  created_at   timestamptz not null default now()
);
create index on reviews (product_id, status);

-- cached rating on products (kept in sync by trigger)
alter table products add column rating_avg   numeric(3,2) not null default 0;
alter table products add column rating_count int          not null default 0;

create or replace function public.refresh_product_rating()
returns trigger language plpgsql as $$
declare v_pid uuid := coalesce(new.product_id, old.product_id);
begin
  update products p set
    rating_avg = coalesce((select round(avg(rating)::numeric,2) from reviews
                           where product_id = v_pid and status = 'published'), 0),
    rating_count = (select count(*) from reviews
                    where product_id = v_pid and status = 'published')
  where p.id = v_pid;
  return null;
end;
$$;
create trigger trg_review_rating
  after insert or update or delete on reviews
  for each row execute function public.refresh_product_rating();

-- ---------------------------------------------------------------------------
-- 4. REPAIRS / SERVICES — intake, status flow, WhatsApp-driven updates.
-- ---------------------------------------------------------------------------
create sequence service_number_seq start 100;

create table service_types (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,            -- 'Screen replacement', 'Battery', ...
  base_price numeric(12,2),
  est_days   int,
  is_active  boolean not null default true,
  sort_order int not null default 0
);

create type service_status as enum
  ('received','diagnosing','awaiting_approval','repairing','ready','collected','cancelled');

create table service_jobs (
  id            uuid primary key default gen_random_uuid(),
  job_number    text not null unique
                  default ('SRV-' || lpad(nextval('service_number_seq')::text, 5, '0')),
  contact_id    uuid references contacts(id),
  customer_name text not null,
  customer_phone text not null,
  device_brand  text,
  device_model  text,
  service_type_id uuid references service_types(id),
  service_category text,                -- snapshot label
  issue         text,
  status        service_status not null default 'received',
  estimate      numeric(12,2),
  final_price   numeric(12,2),
  intake_notes  text,
  created_by    uuid references auth.users(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index on service_jobs (status);
create index on service_jobs (customer_phone);

create table service_status_log (
  id         uuid primary key default gen_random_uuid(),
  job_id     uuid not null references service_jobs(id) on delete cascade,
  from_status service_status,
  to_status   service_status not null,
  note        text,
  changed_by  uuid references auth.users(id),
  created_at  timestamptz not null default now()
);

-- log every status change + link the job to a contact (for repair history)
create or replace function public.service_after_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_phone text := norm_phone(new.customer_phone); v_contact uuid;
begin
  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    insert into service_status_log (job_id, from_status, to_status, changed_by)
    values (new.id, old.status, new.status, auth.uid());
  end if;
  if new.contact_id is null then
    select id into v_contact from contacts where phone_norm = v_phone limit 1;
    if v_contact is null then
      insert into contacts (full_name, phone_norm, phone_display)
      values (new.customer_name, v_phone, new.customer_phone)
      returning id into v_contact;
    end if;
    update service_jobs set contact_id = v_contact where id = new.id;
  end if;
  return new;
end;
$$;
create trigger trg_service_change
  after insert or update on service_jobs
  for each row execute function public.service_after_change();

-- ---------------------------------------------------------------------------
-- 5. Personalized coupon issuance (loyalty) — owner/manager via RPC.
-- ---------------------------------------------------------------------------
create or replace function public.issue_loyalty_coupon(
  p_contact_id uuid, p_type text, p_value numeric, p_days int default 30)
returns text language plpgsql security definer set search_path = public as $$
declare v_code text; v_phone text;
begin
  if not is_staff() then raise exception 'forbidden'; end if;
  select phone_norm into v_phone from contacts where id = p_contact_id;
  v_code := 'LOYAL' || upper(substr(md5(p_contact_id::text || now()::text), 1, 5));
  insert into coupons (code, type, value, min_order_total, max_uses, ends_at, is_active, contact_id)
  values (v_code, p_type::discount_type, p_value, 0, 1, now() + (p_days || ' days')::interval, true, p_contact_id);
  return v_code;
end;
$$;

-- coupons can be bound to a single contact (personalized)
alter table coupons add column contact_id uuid references contacts(id);

-- ---------------------------------------------------------------------------
-- 6. RLS for the new tables
-- ---------------------------------------------------------------------------
alter table contacts            enable row level security;
alter table reviews             enable row level security;
alter table service_types       enable row level security;
alter table service_jobs        enable row level security;
alter table service_status_log  enable row level security;

-- contacts: staff only (PII)
create policy contacts_staff_all on contacts
  for all using (is_staff()) with check (is_staff());

-- reviews: anyone can read PUBLISHED; staff read all; public may submit (lands pending);
-- staff can do anything (publish/hide/edit/post on behalf).
create policy reviews_read_published on reviews
  for select using (status = 'published' or is_staff());
create policy reviews_insert_public on reviews
  for insert with check (
    is_staff()
    or (by_staff = false and status = 'pending')   -- public submissions queue for moderation
  );
create policy reviews_staff_write on reviews
  for update using (is_staff()) with check (is_staff());
create policy reviews_staff_delete on reviews
  for delete using (is_staff());

-- service_types: public read active; staff manage
create policy service_types_read on service_types
  for select using (is_active or is_staff());
create policy service_types_staff on service_types
  for all using (is_staff()) with check (is_staff());

-- service jobs + log: staff only (customers track via WhatsApp / public RPC below)
create policy service_jobs_staff on service_jobs
  for all using (is_staff()) with check (is_staff());
create policy service_log_staff on service_status_log
  for select using (is_staff());

-- public, rate-safe repair status lookup: job number + last 4 phone digits
create or replace function public.track_service(p_job text, p_phone_last4 text)
returns table (job_number text, status service_status, device text,
               service_category text, estimate numeric, updated_at timestamptz)
language sql security definer set search_path = public stable as $$
  select j.job_number, j.status,
         trim(coalesce(j.device_brand,'') || ' ' || coalesce(j.device_model,'')) as device,
         j.service_category, j.estimate, j.updated_at
  from service_jobs j
  where upper(j.job_number) = upper(p_job)
    and right(regexp_replace(j.customer_phone, '\D', '', 'g'), 4) = p_phone_last4
  limit 1;
$$;
grant execute on function public.track_service(text,text) to anon, authenticated;

-- seed a few common service types
insert into service_types (name, base_price, est_days, sort_order) values
  ('Screen replacement', null, 2, 1),
  ('Battery replacement', null, 1, 2),
  ('Charging port repair', null, 2, 3),
  ('Water damage treatment', null, 4, 4),
  ('Software / OS issue', null, 1, 5),
  ('Other / diagnostic', null, 2, 9);

-- guests can redeem coupons too (tracked by order, not account)
alter table coupon_redemptions alter column customer_id drop not null;
