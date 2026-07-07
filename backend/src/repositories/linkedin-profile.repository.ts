import type { LinkedInProfile } from "@prisma/client";
import { prisma } from "../lib/prisma";
import type { NormalizedProfile } from "../types/research.types";

export type UpsertProfileInput = NormalizedProfile & { linkedinUrl: string };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function j(v: unknown): any {
  if (v === undefined || v === null) return undefined;
  return JSON.parse(JSON.stringify(v));
}

export const linkedInProfileRepository = {
  async upsert(input: UpsertProfileInput): Promise<LinkedInProfile> {
    const { linkedinUrl, ...p } = input;

    const payload = {
      linkedinUrl,
      profilePhoto: p.profilePhoto ?? null,
      bannerImage: p.bannerImage ?? null,
      name: p.name ?? null,
      headline: p.headline ?? null,
      location: p.location ?? null,
      company: p.company ?? null,
      companyUrl: p.companyUrl ?? null,
      industry: p.industry ?? null,
      followers: p.followers ?? null,
      connections: p.connections ?? null,
      creatorMode: p.creatorMode ?? false,
      about: p.about ?? null,
      experience: j(p.experience),
      education: j(p.education),
      skills: j(p.skills),
      licenses: j(p.licenses),
      certifications: j(p.certifications),
      languages: j(p.languages),
      volunteer: j(p.volunteer),
      organizations: j(p.organizations),
      projects: j(p.projects),
      awards: j(p.awards),
      patents: j(p.patents),
      publications: j(p.publications),
      courses: j(p.courses),
      causes: j(p.causes),
      groups: j(p.groups),
      interests: j(p.interests),
      recommendations: j(p.recommendations),
      featured: j(p.featured),
      posts: j(p.posts),
      completenessScore: p.completenessScore ?? 0,
      normalizedJson: j(p),
    };

    return prisma.linkedInProfile.upsert({
      where: { linkedinUrl },
      create: payload,
      update: payload,
    });
  },

  async findByUrl(linkedinUrl: string): Promise<LinkedInProfile | null> {
    return prisma.linkedInProfile.findUnique({ where: { linkedinUrl } });
  },
};
