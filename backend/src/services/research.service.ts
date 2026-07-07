import { ResearchStatus } from "@prisma/client";
import { researchJobRepository } from "../repositories/research-job.repository";
import { linkedInProfileRepository } from "../repositories/linkedin-profile.repository";
import { researchResultRepository } from "../repositories/research-result.repository";
import { collectLinkedInProfile } from "../collectors/linkedin.collector";
import type { ResearchJobStatus, ResearchHistoryItem, NormalizedProfile } from "../types/research.types";

function normalizeLinkedInUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const clean = `https://www.linkedin.com${parsed.pathname.replace(/\/$/, "")}`;
    return clean;
  } catch {
    return url;
  }
}

function isValidLinkedInUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      (parsed.hostname === "www.linkedin.com" || parsed.hostname === "linkedin.com") &&
      parsed.pathname.startsWith("/in/") &&
      parsed.pathname.length > 4
    );
  } catch {
    return false;
  }
}

function toProfile(raw: unknown): NormalizedProfile | null {
  if (!raw || typeof raw !== "object") return null;
  return raw as NormalizedProfile;
}

async function runResearch(jobId: string, linkedinUrl: string): Promise<void> {
  try {
    await researchJobRepository.update(jobId, {
      status: ResearchStatus.RUNNING,
      startedAt: new Date(),
      progress: 10,
    });

    await researchJobRepository.update(jobId, { progress: 30 });

    const result = await collectLinkedInProfile(linkedinUrl, jobId);

    await researchJobRepository.update(jobId, { progress: 70 });

    const savedProfile = await linkedInProfileRepository.upsert({
      linkedinUrl,
      ...result.profile,
    });

    await researchJobRepository.update(jobId, { progress: 90 });

    await researchResultRepository.create({
      jobId,
      profileId: savedProfile.id,
      rawJson: result.profile as object,
      metadata: { scrapedAt: result.scrapedAt },
      debugLog: result.debugLog as unknown as object,
      screenshotPath: result.screenshotPath,
    });

    await researchJobRepository.update(jobId, {
      status: ResearchStatus.COMPLETED,
      completedAt: new Date(),
      progress: 100,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    await researchJobRepository
      .update(jobId, {
        status: ResearchStatus.FAILED,
        completedAt: new Date(),
        error: message,
      })
      .catch(() => undefined);
  }
}

export const researchService = {
  async startResearch(rawUrl: string): Promise<{ jobId: string; status: ResearchStatus }> {
    if (!isValidLinkedInUrl(rawUrl)) {
      throw Object.assign(new Error("Invalid LinkedIn profile URL. Must be a linkedin.com/in/ URL."), {
        statusCode: 400,
      });
    }

    const linkedinUrl = normalizeLinkedInUrl(rawUrl);
    const job = await researchJobRepository.create({ linkedinUrl });

    setImmediate(() => {
      runResearch(job.id, linkedinUrl).catch(() => undefined);
    });

    return { jobId: job.id, status: job.status };
  },

  async getJobStatus(jobId: string): Promise<ResearchJobStatus> {
    const job = await researchJobRepository.findByIdWithResult(jobId);

    if (!job) {
      throw Object.assign(new Error("Research job not found."), { statusCode: 404 });
    }

    const profile = job.result?.profile
      ? toProfile(job.result.profile.normalizedJson)
      : null;

    return {
      id: job.id,
      linkedinUrl: job.linkedinUrl,
      status: job.status,
      progress: job.progress,
      error: job.error,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      profile,
    };
  },

  async getHistory(): Promise<ResearchHistoryItem[]> {
    const jobs = await researchJobRepository.findHistoryWithProfiles();

    return jobs.map((job) => ({
      id: job.id,
      linkedinUrl: job.linkedinUrl,
      status: job.status,
      completedAt: job.completedAt,
      createdAt: job.createdAt,
      profile: job.result?.profile
        ? {
            name: job.result.profile.name,
            headline: job.result.profile.headline,
            profilePhoto: job.result.profile.profilePhoto,
            company: job.result.profile.company,
          }
        : null,
    }));
  },

  async deleteJob(jobId: string): Promise<void> {
    const job = await researchJobRepository.findById(jobId);
    if (!job) {
      throw Object.assign(new Error("Research job not found."), { statusCode: 404 });
    }
    await researchJobRepository.delete(jobId);
  },
};
