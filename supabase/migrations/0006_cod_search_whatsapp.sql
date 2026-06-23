-- ============================================================================
-- 0006  Cash on Delivery · WhatsApp orders · fast product search
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Payment method on orders. Online (PayHere) stays the default; COD and
--    WhatsApp orders are created as pending/unpaid and confirmed by staff.
-- ---------------------------------------------------------------------------
alter table orders add column payment_method text not null default 'payhere'
  check (payment_method in ('payhere','cod','whatsapp'));

-- mark a COD/WhatsApp order paid on hand-over (staff, owner/manager/cashier).
-- mirrors confirm_order_paid but for offline collection (no PayHere id).
create or replace function public.mark_order_collected(p_order_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_staff() then raise exception 'forbidden'; end if;
  update orders
     set payment_status = 'paid',
         status = case when status = 'pending' then 'paid' else status end,
         updated_at = now()
   where id = p_order_id
     and payment_method in ('cod','whatsapp');
  -- reservations already taken at checkout; nothing else to do here.
end;
$$;
revoke execute on function public.mark_order_collected(uuid) from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. Fast search. Trigram indexes make ILIKE '%term%' index-assisted across
--    product name / brand / variant SKU.
-- ---------------------------------------------------------------------------
create extension if not exists pg_trgm;

create index if not exists idx_products_name_trgm  on products       using gin (name gin_trgm_ops);
create index if not exists idx_products_brand_trgm on products       using gin (brand gin_trgm_ops);
create index if not exists idx_variants_sku_trgm   on product_variants using gin (sku gin_trgm_ops);

-- one call to search by text and return the catalog shape the app expects
create or replace function public.search_products(p_query text, p_limit int default 40)
returns setof products language sql stable as $$
  select distinct p.*
  from products p
  left join product_variants v on v.product_id = p.id
  where p.is_active
    and (
      p.name  ilike '%' || p_query || '%'
      or p.brand ilike '%' || p_query || '%'
      or v.sku   ilike '%' || p_query || '%'
    )
  limit p_limit;
$$;
grant execute on function public.search_products(text,int) to anon, authenticated;
