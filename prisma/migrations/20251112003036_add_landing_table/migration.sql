-- CreateTable
CREATE TABLE "Landing" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Landing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LandingReview" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "comment" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "landingId" INTEGER NOT NULL,

    CONSTRAINT "LandingReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LandingImage" (
    "id" SERIAL NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "landingId" INTEGER NOT NULL,

    CONSTRAINT "LandingImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LandingVideo" (
    "id" SERIAL NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "landingId" INTEGER NOT NULL,

    CONSTRAINT "LandingVideo_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "LandingReview" ADD CONSTRAINT "LandingReview_landingId_fkey" FOREIGN KEY ("landingId") REFERENCES "Landing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LandingImage" ADD CONSTRAINT "LandingImage_landingId_fkey" FOREIGN KEY ("landingId") REFERENCES "Landing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LandingVideo" ADD CONSTRAINT "LandingVideo_landingId_fkey" FOREIGN KEY ("landingId") REFERENCES "Landing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
