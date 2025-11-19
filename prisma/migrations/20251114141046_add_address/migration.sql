-- OrderStatus enum already created in 20251105144212 migration; duplicate removed.

-- AlterTable
-- This migration originally duplicated tables already created earlier.
-- It now only performs the intended schema change (adding coverImage to Product).
ALTER TABLE "Product" ADD COLUMN "coverImage" TEXT;
