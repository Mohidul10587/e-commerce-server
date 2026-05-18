/*
  Warnings:

  - You are about to drop the column `homeBanners` on the `GeneralSettings` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "GeneralSettings" DROP COLUMN "homeBanners";

-- CreateTable
CREATE TABLE "Banner" (
    "id" SERIAL NOT NULL,
    "desktopImage" TEXT NOT NULL,
    "mobileImage" TEXT NOT NULL,
    "link" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "settingsId" INTEGER NOT NULL,

    CONSTRAINT "Banner_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Banner" ADD CONSTRAINT "Banner_settingsId_fkey" FOREIGN KEY ("settingsId") REFERENCES "GeneralSettings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
