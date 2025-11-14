-- Create enum type if it does not yet exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'UserRole') THEN
    CREATE TYPE "UserRole" AS ENUM ('admin', 'manager', 'user');
  END IF;
END$$;

-- Convert existing column to enum type
ALTER TABLE "User"
  ALTER COLUMN "role" DROP DEFAULT,
  ALTER COLUMN "role" TYPE "UserRole" USING ("role"::text)::"UserRole",
  ALTER COLUMN "role" SET DEFAULT 'user';

-- Ensure existing nulls are set to default value
UPDATE "User" SET "role" = 'user' WHERE "role" IS NULL;
