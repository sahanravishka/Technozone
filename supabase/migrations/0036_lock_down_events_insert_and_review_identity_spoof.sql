-- ============================================================
-- 0036_lock_down_events_insert_and_review_identity_spoof.sql
-- Found during a full site review, checked in to match what was
-- already applied live.
--
-- events_insert_any allowed literally anyone (anon included) to
-- insert arbitrary rows with an unbounded jsonb payload — a public
-- storage-bloat/cost DoS vector with no rate limit possible at the
-- RLS layer. Nothing in the app writes to this table (grep found
-- zero references, table is empty) — dead surface with no
-- offsetting benefit, so closing it rather than leaving it open.
--
-- reviews_insert_public's with_check never validated customer_id
-- against auth.uid(). The intended path is submitReview() (app/
-- [locale]/product/actions.ts), which checks purchase ownership
-- server-side before setting customer_id — but the RLS policy
-- itself would let any authenticated caller who inserts into
-- `reviews` directly via the client SDK set customer_id to an
-- arbitrary other real customer, planting a fake pending review
-- under someone else's identity for staff to (maybe) approve. The
-- insert still lands as pending either way; this only closes the
-- identity-spoofing gap.
-- ============================================================

drop policy if exists events_insert_any on public.events;
create policy events_staff_write on public.events for insert
  with check (is_staff());

drop policy if exists reviews_insert_public on public.reviews;
create policy reviews_insert_public on public.reviews for insert
  with check (
    is_staff() OR (
      by_staff = false AND status = 'pending'
      AND (customer_id IS NULL OR customer_id = auth.uid())
    )
  );
