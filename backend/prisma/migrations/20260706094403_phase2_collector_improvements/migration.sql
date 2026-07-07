-- AlterTable
ALTER TABLE "linkedin_profiles" ADD COLUMN     "bannerImage" TEXT,
ADD COLUMN     "causes" JSONB,
ADD COLUMN     "companyUrl" TEXT,
ADD COLUMN     "completenessScore" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "connections" TEXT,
ADD COLUMN     "courses" JSONB,
ADD COLUMN     "creatorMode" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "followers" INTEGER,
ADD COLUMN     "groups" JSONB,
ADD COLUMN     "industry" TEXT,
ADD COLUMN     "interests" JSONB,
ADD COLUMN     "patents" JSONB,
ADD COLUMN     "publications" JSONB,
ADD COLUMN     "recommendations" JSONB;

-- AlterTable
ALTER TABLE "research_results" ADD COLUMN     "debugLog" JSONB,
ADD COLUMN     "screenshotPath" TEXT;
