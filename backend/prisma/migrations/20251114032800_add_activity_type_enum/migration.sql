-- Create ActivityType enum if it does not exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ActivityType') THEN
    CREATE TYPE "ActivityType" AS ENUM ('call', 'email', 'meeting', 'note', 'task');
  END IF;
END$$;

-- Convert existing column to enum type
ALTER TABLE "Activity"
  ALTER COLUMN "type" DROP DEFAULT,
  ALTER COLUMN "type" TYPE "ActivityType" USING ("type"::text::"ActivityType"),
  ALTER COLUMN "type" SET DEFAULT 'task';

-- Ensure scheduledAt column exists
ALTER TABLE "Activity"
  ADD COLUMN IF NOT EXISTS "scheduledAt" TIMESTAMP(3);
