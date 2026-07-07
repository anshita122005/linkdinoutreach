-- CreateEnum
CREATE TYPE "ResearchStatus" AS ENUM ('PENDING', 'QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "research_jobs" (
    "id" TEXT NOT NULL,
    "linkedinUrl" TEXT NOT NULL,
    "status" "ResearchStatus" NOT NULL DEFAULT 'PENDING',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "research_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "linkedin_profiles" (
    "id" TEXT NOT NULL,
    "linkedinUrl" TEXT NOT NULL,
    "profilePhoto" TEXT,
    "name" TEXT,
    "headline" TEXT,
    "location" TEXT,
    "company" TEXT,
    "about" TEXT,
    "experience" JSONB,
    "education" JSONB,
    "skills" JSONB,
    "licenses" JSONB,
    "certifications" JSONB,
    "languages" JSONB,
    "volunteer" JSONB,
    "organizations" JSONB,
    "projects" JSONB,
    "awards" JSONB,
    "featured" JSONB,
    "posts" JSONB,
    "normalizedJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "linkedin_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "research_results" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "rawJson" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "research_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "linkedin_profiles_linkedinUrl_key" ON "linkedin_profiles"("linkedinUrl");

-- CreateIndex
CREATE UNIQUE INDEX "research_results_jobId_key" ON "research_results"("jobId");

-- AddForeignKey
ALTER TABLE "research_results" ADD CONSTRAINT "research_results_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "research_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_results" ADD CONSTRAINT "research_results_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "linkedin_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
