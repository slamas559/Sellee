-- supabase/pending-reviews-v2-safe.sql
-- Safe migration for migrating pending_reviews to the 3-step review flow.
-- Strategy:
-- 1) Add any missing columns (if table already exists).
-- 2) Migrate old `rating` column into `product_rating` if present.
-- 3) Normalize bad/legacy `step` values to `product_rating` (non-completed rows).
-- 4) Add the step check constraint as NOT VALID to avoid failure if offending rows remain.
-- 5) Validate the constraint after cleanup.
-- Run this in the Supabase SQL editor (it is a single transaction and safe to re-run).

BEGIN;

-- 1) Drop existing check so we can recreate it consistently
ALTER TABLE public.pending_reviews
  DROP CONSTRAINT IF EXISTS pending_reviews_step_check;

-- 2) Add any new columns required by v2 (idempotent)
ALTER TABLE public.pending_reviews
  ADD COLUMN IF NOT EXISTS product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS product_name text,
  ADD COLUMN IF NOT EXISTS store_name text,
  ADD COLUMN IF NOT EXISTS product_rating integer CHECK (product_rating BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS product_comment text;

-- 3) If an old `rating` column exists, migrate its values into product_rating then drop it
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'pending_reviews'
      AND column_name = 'rating'
  ) THEN
    UPDATE public.pending_reviews
      SET product_rating = rating
      WHERE product_rating IS NULL;
    ALTER TABLE public.pending_reviews DROP COLUMN IF EXISTS rating;
  END IF;
END
$$;

-- 4) Normalize any NULL or invalid steps to the initial step so the NOT VALID constraint can be applied safely.
-- Only adjust active (not completed) rows by default to avoid rewriting historical data.
UPDATE public.pending_reviews
SET step = 'product_rating'
WHERE (step IS NULL OR step NOT IN ('product_rating','product_comment','vendor_rating'))
  AND completed_at IS NULL;

-- 5) Create the check constraint without validating existing rows (safe).
ALTER TABLE public.pending_reviews
  ADD CONSTRAINT pending_reviews_step_check
  CHECK (step IN ('product_rating','product_comment','vendor_rating')) NOT VALID;

-- 6) Now that we've normalized current rows, validate the constraint. If validation fails,
--    the command will report offending rows so you can inspect them and re-run the migration after fixing.
ALTER TABLE public.pending_reviews
  VALIDATE CONSTRAINT pending_reviews_step_check;

COMMIT;

-- Optional: indexes (idempotent)
CREATE INDEX IF NOT EXISTS idx_pending_reviews_product ON public.pending_reviews (product_id) WHERE product_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pending_reviews_customer_phone ON public.pending_reviews (customer_phone) WHERE completed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_pending_reviews_order ON public.pending_reviews (order_id);

-- Note: If your table does not exist yet, the full table creation SQL is provided in
-- supabase/pending-reviews.sql (or pending-reviews-v2.sql) in this repo.
