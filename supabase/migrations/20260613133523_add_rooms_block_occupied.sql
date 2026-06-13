/*
# Add block and occupied columns to rooms table

1. Changes
- Add `block` text column to rooms (defaults to 'A')
- Add `occupied` integer column to rooms (defaults to 0)

2. Notes
- These columns support room grouping by building block and tracking occupancy.
*/

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name = 'rooms' AND column_name = 'block'
  ) THEN
    ALTER TABLE rooms ADD COLUMN block text NOT NULL DEFAULT 'A';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name = 'rooms' AND column_name = 'occupied'
  ) THEN
    ALTER TABLE rooms ADD COLUMN occupied integer NOT NULL DEFAULT 0;
  END IF;
END $$;
