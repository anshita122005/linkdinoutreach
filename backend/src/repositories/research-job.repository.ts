import { type ResearchJob, ResearchStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";

export type CreateJobInput = {
  linkedinUrl: string;
};

export type UpdateJobInput = {
  status?: ResearchStatus;
  progress?: number;
  error?: string | null;
  startedAt?: Date;
  completedAt?: Date;
};

export const researchJobRepository = {
  async create(input: CreateJobInput): Promise<ResearchJob> {
    return prisma.researchJob.create({
      data: {
        linkedinUrl: input.linkedinUrl,
        status: ResearchStatus.PENDING,
      },
    });
  },

  async findById(id: string): Promise<ResearchJob | null> {
    return prisma.researchJob.findUnique({ where: { id } });
  },

  async update(id: string, input: UpdateJobInput): Promise<ResearchJob> {
    return prisma.researchJob.update({
      where: { id },
      data: input,
    });
  },

  async findHistory(limit = 50): Promise<ResearchJob[]> {
    return prisma.researchJob.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  },

  async delete(id: string): Promise<void> {
    await prisma.researchJob.delete({ where: { id } });
  },

  async findByIdWithResult(id: string) {
    return prisma.researchJob.findUnique({
      where: { id },
      include: {
        result: {
          include: { profile: true },
        },
      },
    });
  },

  async findHistoryWithProfiles(limit = 50) {
    return prisma.researchJob.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        result: {
          include: {
            profile: {
              select: {
                name: true,
                headline: true,
                profilePhoto: true,
                company: true,
              },
            },
          },
        },
      },
    });
  },
};
