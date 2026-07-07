import type { ResearchStatus } from "@prisma/client";

export type { ResearchStatus };

export interface ExperienceEntry {
  title: string;
  company: string;
  companyUrl?: string;
  employmentType?: string;
  location?: string;
  locationType?: string;
  startDate?: string;
  endDate?: string;
  duration?: string;
  current: boolean;
  description?: string;
}

export interface EducationEntry {
  school: string;
  degree?: string;
  field?: string;
  startDate?: string;
  endDate?: string;
  activities?: string;
  description?: string;
  grade?: string;
}

export interface SkillEntry {
  name: string;
  endorsements?: number;
}

export interface LicenseEntry {
  name: string;
  issuingOrganization?: string;
  issueDate?: string;
  expirationDate?: string;
  credentialId?: string;
  credentialUrl?: string;
}

export interface CertificationEntry {
  name: string;
  issuingOrganization?: string;
  issueDate?: string;
}

export interface LanguageEntry {
  name: string;
  proficiency?: string;
}

export interface VolunteerEntry {
  role: string;
  organization: string;
  cause?: string;
  startDate?: string;
  endDate?: string;
  current: boolean;
  description?: string;
}

export interface OrganizationEntry {
  name: string;
  position?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
}

export interface ProjectEntry {
  name: string;
  description?: string;
  url?: string;
  startDate?: string;
  endDate?: string;
  contributors?: string[];
}

export interface AwardEntry {
  title: string;
  issuedBy?: string;
  issueDate?: string;
  description?: string;
}

export interface PatentEntry {
  title: string;
  patentOffice?: string;
  patentNumber?: string;
  status?: string;
  date?: string;
  description?: string;
}

export interface PublicationEntry {
  title: string;
  publisher?: string;
  date?: string;
  description?: string;
  url?: string;
  contributors?: string[];
}

export interface CourseEntry {
  name: string;
  associatedWith?: string;
  number?: string;
}

export interface GroupEntry {
  name: string;
  url?: string;
}

export interface InterestEntry {
  type: "company" | "school" | "person" | "newsletter" | "group" | "other";
  name: string;
  followers?: string;
  description?: string;
}

export interface RecommendationEntry {
  recommenderName: string;
  recommenderHeadline?: string;
  recommenderUrl?: string;
  relationship?: string;
  date?: string;
  text: string;
}

export interface FeaturedEntry {
  type: "post" | "article" | "link" | "media" | "document";
  title?: string;
  description?: string;
  url?: string;
  mediaUrl?: string;
  thumbnailUrl?: string;
}

export interface PostEntry {
  content?: string;
  postedAt?: string;
  likes?: number;
  comments?: number;
  shares?: number;
  mediaUrl?: string;
  mediaType?: "image" | "video" | "article" | "document";
  articleTitle?: string;
  articleUrl?: string;
}

export interface NormalizedProfile {
  profilePhoto?: string;
  bannerImage?: string;
  name?: string;
  headline?: string;
  location?: string;
  company?: string;
  companyUrl?: string;
  industry?: string;
  followers?: number;
  connections?: string;
  creatorMode?: boolean;
  about?: string;
  experience: ExperienceEntry[];
  education: EducationEntry[];
  skills: SkillEntry[];
  licenses: LicenseEntry[];
  certifications: CertificationEntry[];
  languages: LanguageEntry[];
  volunteer: VolunteerEntry[];
  organizations: OrganizationEntry[];
  projects: ProjectEntry[];
  awards: AwardEntry[];
  patents: PatentEntry[];
  publications: PublicationEntry[];
  courses: CourseEntry[];
  causes: string[];
  groups: GroupEntry[];
  interests: InterestEntry[];
  recommendations: RecommendationEntry[];
  featured: FeaturedEntry[];
  posts: PostEntry[];
  completenessScore: number;
}

export interface CollectorDebugEntry {
  section: string;
  found: boolean;
  selector?: string;
  count?: number;
  timeMs: number;
  note?: string;
}

export interface CreateResearchJobInput {
  linkedinUrl: string;
}

export interface ResearchJobStatus {
  id: string;
  linkedinUrl: string;
  status: ResearchStatus;
  progress: number;
  error?: string | null;
  startedAt?: Date | null;
  completedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  profile?: NormalizedProfile | null;
}

export interface ResearchHistoryItem {
  id: string;
  linkedinUrl: string;
  status: ResearchStatus;
  completedAt?: Date | null;
  createdAt: Date;
  profile?: {
    name?: string | null;
    headline?: string | null;
    profilePhoto?: string | null;
    company?: string | null;
    completenessScore?: number | null;
  } | null;
}

export interface CollectorResult {
  profile: NormalizedProfile;
  scrapedAt: string;
  debugLog: CollectorDebugEntry[];
  screenshotPath?: string;
}
