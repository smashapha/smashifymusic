-- Add promotional discount support to songs
ALTER TABLE songs
  ADD COLUMN IF NOT EXISTS discount_percent smallint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sale_ends_at timestamptz NULL;

ALTER TABLE songs
  ADD CONSTRAINT songs_discount_percent_range
  CHECK (discount_percent >= 0 AND discount_percent <= 90);
