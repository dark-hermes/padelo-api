/*
  Warnings:

  - You are about to drop the `LandingImage` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."LandingImage" DROP CONSTRAINT "LandingImage_landingId_fkey";

-- DropTable
DROP TABLE "public"."LandingImage";

-- CreateTable
CREATE TABLE "LandingImageProduct" (
    "id" SERIAL NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "price" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "landingId" INTEGER NOT NULL,

    CONSTRAINT "LandingImageProduct_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "LandingImageProduct" ADD CONSTRAINT "LandingImageProduct_landingId_fkey" FOREIGN KEY ("landingId") REFERENCES "Landing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
