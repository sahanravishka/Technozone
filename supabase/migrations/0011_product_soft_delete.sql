-- 0011_product_soft_delete.sql
-- Adds soft-delete to products so removed items keep order/warranty history intact.
--
-- Three states:
--   * is_active = true,  deleted_at null  -> PUBLISHED (live on website)
--   * is_active = false, deleted_at null  -> HIDDEN    (off website, still in admin)
--   * deleted_at not null                 -> TRASHED   (off website + admin lists,
--                                                        row kept for FK integrity)

alter table products
  add column if not exists deleted_at timestamptz;

-- Fast filtering of live/admin-visible products (exclude trashed).
create index if not exists idx_products_not_deleted
  on products (created_at desc)
  where deleted_at is null;

-- Optional: who trashed it (audit). Nullable, no FK enforcement to keep it simple.
alter table products
  add column if not exists deleted_by uuid;
