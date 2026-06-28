-- Create LandingPage table
CREATE TABLE "LandingPage" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "headingText" TEXT,
    "youtubeVideoUrl" TEXT,
    "designSampleImageUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "qna" JSONB,
    "forWhom" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "forWhomHeading" TEXT,
    "forWhomDescription" TEXT,
    "whyNeeded" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "whyNeededHeading" TEXT,
    "whyNeededDescription" TEXT,
    "customerReviewImageUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LandingPage_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "LandingPage_slug_key" ON "LandingPage"("slug");

-- Create LandingPageProduct join table
CREATE TABLE "LandingPageProduct" (
    "id" SERIAL NOT NULL,
    "landingPageId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "variantMode" TEXT NOT NULL DEFAULT 'all',
    "selectedVariantIds" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isExtraInk" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "LandingPageProduct_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "LandingPageProduct" ADD CONSTRAINT "LandingPageProduct_landingPageId_fkey"
    FOREIGN KEY ("landingPageId") REFERENCES "LandingPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LandingPageProduct" ADD CONSTRAINT "LandingPageProduct_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Remove landing fields from Product
ALTER TABLE "Product"
    DROP COLUMN IF EXISTS "showOnLanding",
    DROP COLUMN IF EXISTS "isShowAsExtraInkInLandingPage",
    DROP COLUMN IF EXISTS "landingVariantMode",
    DROP COLUMN IF EXISTS "headingText",
    DROP COLUMN IF EXISTS "youtubeVideoUrl",
    DROP COLUMN IF EXISTS "designSampleImageUrls",
    DROP COLUMN IF EXISTS "qna",
    DROP COLUMN IF EXISTS "forWhom",
    DROP COLUMN IF EXISTS "forWhomHeading",
    DROP COLUMN IF EXISTS "forWhomDescription",
    DROP COLUMN IF EXISTS "whyNeeded",
    DROP COLUMN IF EXISTS "whyNeededHeading",
    DROP COLUMN IF EXISTS "whyNeededDescription",
    DROP COLUMN IF EXISTS "customerReviewImageUrls";

-- Remove isLandingDefault from ProductVariant
ALTER TABLE "ProductVariant" DROP COLUMN IF EXISTS "isLandingDefault";
