-- Add tags array and lastContactedAt to contacts
ALTER TABLE "Contact"
  ADD COLUMN IF NOT EXISTS "tags" TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "lastContactedAt" TIMESTAMP(3);

-- Add source column to deals
ALTER TABLE "Deal"
  ADD COLUMN IF NOT EXISTS "source" TEXT;

-- Add scheduledAt to activities
ALTER TABLE "Activity"
  ADD COLUMN IF NOT EXISTS "scheduledAt" TIMESTAMP(3);
