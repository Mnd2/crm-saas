-- Add missing "name" column so Prisma schema matches database structure
ALTER TABLE "User"
ADD COLUMN "name" TEXT NOT NULL DEFAULT '';

-- Backfill existing rows with a reasonable display name
UPDATE "User"
SET "name" = COALESCE(NULLIF(TRIM(CONCAT_WS(' ', "firstName", "lastName")), ''), "email")
WHERE "name" = '';
