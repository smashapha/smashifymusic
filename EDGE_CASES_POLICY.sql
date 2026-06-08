-- Scenario 5: Collab Protection
ALTER TABLE public.songs
  ADD COLUMN IF NOT EXISTS featured_artist_id UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS collab_protected BOOLEAN DEFAULT false;

-- Scenario 6: Booster Pack Refund Credit
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS renewal_credit NUMERIC DEFAULT 0;

-- Scenario 7: Label Slot Allocations
CREATE TABLE IF NOT EXISTS public.label_slot_allocations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  label_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  artist_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  allocated_slots INTEGER DEFAULT 50,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Scenario 8: Song Suspensions
-- Dynamically find and drop the previous check constraint for slot_mode, then recreate it to include 'suspended'
DO $$ 
DECLARE 
  constraint_name text;
BEGIN
  SELECT conname INTO constraint_name 
  FROM pg_constraint 
  WHERE conrelid = 'public.songs'::regclass 
    AND contype = 'c' 
    AND pg_get_constraintdef(oid) LIKE '%slot_mode%';
    
  IF constraint_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.songs DROP CONSTRAINT ' || constraint_name;
  END IF;
END $$;

ALTER TABLE public.songs 
  ADD CONSTRAINT songs_slot_mode_check 
  CHECK (slot_mode IN ('hot', 'active', 'cold', 'archive', 'suspended'));
