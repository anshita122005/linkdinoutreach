import type { ResearchResult } from "@prisma/client";
import { prisma } from "../lib/prisma";

export type CreateResultInput = {
  jobId: string;
  profileId: string;
  rawJson?: object;
  metadata?: object;
  debugLog?: object;
  screenshotPath?: string;
};

export const researchResultRepository = {
  async create(input: CreateResultInput): Promise<ResearchResult> {
    return prisma.researchResult.create({
      data: {
        jobId: input.jobId,
        profileId: input.profileId,
        rawJson: input.rawJson ? JSON.parse(JSON.stringify(input.rawJson)) : undefined,
        metadata: input.metadata ? JSON.parse(JSON.stringify(input.metadata)) : undefined,
        debugLog: input.debugLog ? JSON.parse(JSON.stringify(input.debugLog)) : undefined,
        screenshotPath: input.screenshotPath,
      },
    });
  },

  async findByJobId(jobId: string): Promise<ResearchResult | null> {
    return prisma.researchResult.findUnique({ where: { jobId } });
  },
};
