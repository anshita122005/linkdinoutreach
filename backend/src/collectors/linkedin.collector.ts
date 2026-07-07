import path from "node:path";
import fs from "node:fs";
import type { Page } from "playwright";
import { browserManager } from "../lib/browser-manager";
import { env } from "../config/env";
import type {
  CollectorResult,
  CollectorDebugEntry,
  NormalizedProfile,
  ExperienceEntry,
  EducationEntry,
  SkillEntry,
  LicenseEntry,
  LanguageEntry,
  VolunteerEntry,
  OrganizationEntry,
  ProjectEntry,
  AwardEntry,
  PatentEntry,
  PublicationEntry,
  CourseEntry,
  RecommendationEntry,
  FeaturedEntry,
  PostEntry,
  InterestEntry,
} from "../types/research.types";

// ─── Constants ────────────────────────────────────────────────────────────────

const NAVIGATION_TIMEOUT = env.RESEARCH_TIMEOUT_MS;
const MAX_RETRIES = 2;
const SCREENSHOTS_DIR = path.resolve(process.cwd(), "data", "screenshots");

// ─── Debug logger ─────────────────────────────────────────────────────────────

class Logger {
  entries: CollectorDebugEntry[] = [];
  private timers: Map<string, number> = new Map();

  start(section: string): void {
    this.timers.set(section, Date.now());
  }

  done(
    section: string,
    found: boolean,
    opts?: { selector?: string; count?: number; note?: string },
  ): void {
    const started = this.timers.get(section) ?? Date.now();
    this.entries.push({
      section,
      found,
      selector: opts?.selector,
      count: opts?.count,
      timeMs: Date.now() - started,
      note: opts?.note,
    });
    const status = found ? "✓" : "✗";
    const count = opts?.count !== undefined ? ` (${opts.count})` : "";
    const note = opts?.note ? ` — ${opts.note}` : "";
    console.log(`[collector] ${status} ${section}${count}${note}`);
  }
}

// ─── Selector helper (Node context — no serialization) ────────────────────────

const tryText = async (page: Page, selectors: string[]): Promise<string | undefined> => {
  for (const sel of selectors) {
    try {
      const el = await page.$(sel);
      if (el) {
        const t = (await el.innerText()).trim();
        if (t) return t;
      }
    } catch {
      // try next
    }
  }
  return undefined;
};

// ─── Scroll & expand ──────────────────────────────────────────────────────────

const scrollToBottom = async (page: Page): Promise<void> => {
  let lastHeight = 0;
  let unchangedCount = 0;

  while (unchangedCount < 4) {
    // Simple evaluate: no named inner functions → no __name injection
    const newHeight: number = await page.evaluate(() => {
      window.scrollBy(0, 900);
      return document.body.scrollHeight;
    });

    await page.waitForTimeout(600);

    if (newHeight === lastHeight) {
      unchangedCount++;
    } else {
      unchangedCount = 0;
      lastHeight = newHeight;
    }
  }

  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(400);
};

const expandSeeMore = async (page: Page): Promise<number> => {
  let clicked = 0;
  const buttonSelectors = [
    "button.inline-show-more-text__button",
    "button[aria-label*='see more']",
    "button[aria-label*='Show more']",
    ".lt-line-clamp__more button",
    "button.pv-profile-section__see-more-inline",
  ];

  for (const sel of buttonSelectors) {
    try {
      const buttons = await page.$$(sel);
      for (const btn of buttons) {
        try {
          if (await btn.isVisible()) {
            await btn.click();
            await page.waitForTimeout(300);
            clicked++;
          }
        } catch {
          // button may have become stale
        }
      }
    } catch {
      // selector failed
    }
  }

  return clicked;
};

const dismissModals = async (page: Page): Promise<void> => {
  const dismissSelectors = [
    "button[data-tracking-control-name='auth-wall_dismiss']",
    "button[aria-label='Dismiss']",
    ".artdeco-modal__dismiss",
  ];
  for (const sel of dismissSelectors) {
    try {
      const el = await page.$(sel);
      if (el && (await el.isVisible())) {
        await el.click();
        await page.waitForTimeout(200);
      }
    } catch {
      // no modal present
    }
  }
};

// ─── Top card ─────────────────────────────────────────────────────────────────

interface TopCard {
  profilePhoto?: string;
  bannerImage?: string;
  name?: string;
  headline?: string;
  location?: string;
  followers?: number;
  connections?: string;
  creatorMode?: boolean;
  company?: string;
  companyUrl?: string;
}

const extractTopCard = async (page: Page, log: Logger): Promise<TopCard> => {
  log.start("topCard");

  const name = await tryText(page, [
    "h1.text-heading-xlarge",
    "h1[class*='heading']",
    ".top-card-layout__title",
    "h1",
  ]);

  const headline = await tryText(page, [
    ".text-body-medium.break-words",
    ".pv-top-card--list .text-body-medium",
    ".pv-top-card__headline",
    ".top-card-layout__headline",
  ]);

  const location = await tryText(page, [
    "span.text-body-small.inline.t-black--light.break-words",
    ".pv-top-card--list-bullet span[class*='location']",
    ".pv-top-card__location",
    ".top-card__subline-item",
    ".pv-text-details__left-panel span.text-body-small",
  ]);

  const profilePhoto = await (async () => {
    for (const sel of [
      ".pv-top-card-profile-picture__image",
      "img.pv-top-card-profile-picture__image--show",
      ".profile-photo-edit img",
      ".pv-top-card img.EntityPhoto-circle-9",
    ]) {
      try {
        const el = await page.$(sel);
        if (el) {
          const src = await el.getAttribute("src");
          if (src?.startsWith("http")) return src;
        }
      } catch { /* try next */ }
    }
    return undefined;
  })();

  const bannerImage = await (async () => {
    for (const sel of [
      ".profile-background-image__image",
      ".pv-top-card__cover img",
      "img[class*='background-image']",
    ]) {
      try {
        const el = await page.$(sel);
        if (el) {
          const src = await el.getAttribute("src");
          if (src?.startsWith("http")) return src;
        }
      } catch { /* try next */ }
    }
    return undefined;
  })();

  // No named inner functions → safe from __name injection
  const followers = await (async () => {
    const allText = await page.evaluate(() => {
      const spans = Array.from(document.querySelectorAll("span"));
      for (const s of spans) {
        const t = (s.textContent ?? "").trim();
        if (/^\d[\d,]*\s+followers?$/i.test(t)) return t;
      }
      return null;
    });
    if (!allText) return undefined;
    const m = allText.match(/[\d,]+/);
    return m ? parseInt(m[0].replace(/,/g, ""), 10) : undefined;
  })();

  const connections = await tryText(page, [
    ".pv-top-card--list .pv-top-card__connections",
    "span.distance-badge",
    ".pv-top-card--list span[class*='connection']",
    "a[href*='connections'] span",
  ]);

  // No named inner functions → safe
  const creatorMode = await page.evaluate(() => {
    return !!document.querySelector(
      "[class*='creator-mode'], [data-control-name*='creator'], .pv-creator-mode-panel",
    );
  });

  log.done("topCard", !!(name || headline), {
    note: name ? `name="${name}"` : "no name found",
  });

  return { profilePhoto, bannerImage, name, headline, location, followers, connections: connections || undefined, creatorMode };
};

// ─── About ────────────────────────────────────────────────────────────────────

const extractAbout = async (page: Page, log: Logger): Promise<string | undefined> => {
  log.start("about");

  try {
    const btn = await page.$(
      "#about ~ * button.inline-show-more-text__button, section:has(#about) button.inline-show-more-text__button",
    );
    if (btn && (await btn.isVisible())) {
      await btn.click();
      await page.waitForTimeout(300);
    }
  } catch { /* no button */ }

  // No named inner functions → safe
  const result = await page.evaluate(() => {
    const anchor =
      document.querySelector("#about") ??
      document.querySelector("[id*='about']");
    if (!anchor) return undefined;
    const section = anchor.closest("section") ?? anchor.parentElement?.parentElement;
    if (!section) return undefined;
    const spans = Array.from(section.querySelectorAll("span[aria-hidden='true']"));
    const texts = spans.map((s) => (s.textContent ?? "").trim()).filter(Boolean);
    return texts.find((t) => t.length > 30) ?? texts.join(" ") ?? undefined;
  });

  log.done("about", !!result, { note: result ? `${result.length} chars` : "not found" });
  return result;
};

// ─── Experience ───────────────────────────────────────────────────────────────
// All helper logic uses IIFE or IIFE-with-params to avoid named const-arrow
// bindings, which would cause tsx/esbuild to inject __name() references.

const extractExperience = async (page: Page, log: Logger): Promise<ExperienceEntry[]> => {
  log.start("experience");

  const entries = await page.evaluate(() => {
    // findSection as IIFE — no named binding, no __name injection
    const section = (() => {
      for (const id of ["#experience", "#experience-section", "[id*='experience']"]) {
        try {
          const el = document.querySelector(id);
          if (el) return el.closest("section") ?? el.parentElement;
        } catch { /* skip */ }
      }
      return null;
    })();

    if (!section) return [];

    const EMPLOYMENT_TYPES = ["Full-time", "Part-time", "Self-employed", "Freelance", "Contract", "Internship", "Apprenticeship", "Seasonal"];
    const LOCATION_TYPES = ["Remote", "Hybrid", "On-site"];

    const result: Array<{
      title: string; company: string; companyUrl?: string; employmentType?: string;
      location?: string; locationType?: string; startDate?: string; endDate?: string;
      duration?: string; current: boolean; description?: string;
    }> = [];

    const items = section.querySelectorAll(":scope > ul > li, ul.pvs-list > li");

    items.forEach((item) => {
      // ariaTexts inlined — no named binding
      const texts = Array.from(item.querySelectorAll("span[aria-hidden='true']"))
        .map((s) => (s.textContent ?? "").trim())
        .filter(Boolean);

      if (!texts.length) return;

      const subItems = item.querySelectorAll("ul.pvs-list > li, ul > li.artdeco-list__item");
      const companyLink = item.querySelector("a[href*='/company/']") as HTMLAnchorElement | null;

      // Inline parsing — no named function bindings, so no __name injection
      if (subItems.length > 1) {
        // Grouped role (multiple positions at same company)
        const cParts = (texts[0] ?? "").split("·").map((p: string) => p.trim());
        const company = cParts[0] ?? (texts[0] ?? "");
        const employmentType = cParts[1] ? EMPLOYMENT_TYPES.find((t) => (cParts[1] as string).includes(t)) ?? cParts[1] : undefined;

        subItems.forEach((sub) => {
          const st = Array.from(sub.querySelectorAll("span[aria-hidden='true']"))
            .map((s) => (s.textContent ?? "").trim())
            .filter(Boolean);
          if (!st.length) return;

          const dParts = (st[1] ?? "").split("·").map((p: string) => p.trim());
          const datePart = dParts[0] ?? "";
          const duration = dParts[1];
          const dateSegs = datePart.split(/\s*[-–]\s*/);
          const startDate = dateSegs[0]?.trim() || undefined;
          const endRaw = dateSegs[1]?.trim();
          const current = !endRaw || endRaw.toLowerCase() === "present";
          const locRaw = st[2] ?? "";

          result.push({
            title: st[0] ?? "",
            company,
            companyUrl: companyLink?.href,
            employmentType,
            location: locRaw ? locRaw.split("·")[0]?.trim() : undefined,
            locationType: locRaw ? LOCATION_TYPES.find((t) => locRaw.includes(t)) : undefined,
            startDate,
            endDate: current ? undefined : endRaw,
            duration,
            current,
            description: st.length > 3 ? st[st.length - 1] : undefined,
          });
        });
      } else {
        // Single role
        const cParts = (texts[1] ?? "").split("·").map((p: string) => p.trim());
        const company = cParts[0] ?? (texts[1] ?? "");
        const employmentType = cParts[1] ? EMPLOYMENT_TYPES.find((t) => (cParts[1] as string).includes(t)) ?? cParts[1] : undefined;

        const dParts = (texts[2] ?? "").split("·").map((p: string) => p.trim());
        const datePart = dParts[0] ?? "";
        const duration = dParts[1];
        const dateSegs = datePart.split(/\s*[-–]\s*/);
        const startDate = dateSegs[0]?.trim() || undefined;
        const endRaw = dateSegs[1]?.trim();
        const current = !endRaw || endRaw.toLowerCase() === "present";
        const locRaw = texts[3] ?? "";

        result.push({
          title: texts[0] ?? "",
          company,
          companyUrl: companyLink?.href,
          employmentType,
          location: locRaw ? locRaw.split("·")[0]?.trim() : undefined,
          locationType: locRaw ? LOCATION_TYPES.find((t) => locRaw.includes(t)) : undefined,
          startDate,
          endDate: current ? undefined : endRaw,
          duration,
          current,
          description: texts.length > 4 ? texts[texts.length - 1] : undefined,
        });
      }
    });

    return result;
  }) as ExperienceEntry[];

  log.done("experience", entries.length > 0, { count: entries.length });
  return entries;
};

// ─── Education ────────────────────────────────────────────────────────────────

const extractEducation = async (page: Page, log: Logger): Promise<EducationEntry[]> => {
  log.start("education");

  const entries = await page.evaluate(() => {
    const section = (() => {
      for (const id of ["#education", "#education-section", "[id*='education']"]) {
        try {
          const el = document.querySelector(id);
          if (el) return el.closest("section") ?? el.parentElement;
        } catch { /* skip */ }
      }
      return null;
    })();

    if (!section) return [];

    const result: Array<{
      school: string; degree?: string; field?: string; startDate?: string;
      endDate?: string; activities?: string; description?: string; grade?: string;
    }> = [];

    const items = section.querySelectorAll(":scope > ul > li, ul.pvs-list > li");

    items.forEach((item) => {
      const texts = Array.from(item.querySelectorAll("span[aria-hidden='true']"))
        .map((s) => (s.textContent ?? "").trim())
        .filter(Boolean);
      if (!texts.length) return;

      // parseDegree inline
      const degreeRaw = texts[1] ?? "";
      const degreeParts = degreeRaw.split(",").map((p: string) => p.trim());
      const degree = degreeParts[0] || undefined;
      const field = degreeParts[1] || undefined;

      // parseDateRange inline
      const dateRaw = texts[2] ?? "";
      const dateParts = dateRaw.split(/[-–]/).map((p: string) => p.trim());
      const startDate = dateParts[0] || undefined;
      const endDate = dateParts[1] || undefined;

      let grade: string | undefined;
      let activities: string | undefined;
      let description: string | undefined;

      for (let i = 3; i < texts.length; i++) {
        const t = texts[i];
        if (!t) continue;
        if (t.startsWith("Grade:") || t.startsWith("GPA")) { grade = t; }
        else if (t.startsWith("Activities")) { activities = t; }
        else if (t.length > 30) { description = t; }
      }

      result.push({ school: texts[0] ?? "", degree, field, startDate, endDate, grade, activities, description });
    });

    return result;
  }) as EducationEntry[];

  log.done("education", entries.length > 0, { count: entries.length });
  return entries;
};

// ─── Skills ───────────────────────────────────────────────────────────────────

const extractSkills = async (page: Page, log: Logger): Promise<SkillEntry[]> => {
  log.start("skills");

  const entries = await page.evaluate(() => {
    const section = (() => {
      for (const id of ["#skills", "#skills-section", "[id*='skills']"]) {
        try {
          const el = document.querySelector(id);
          if (el) return el.closest("section") ?? el.parentElement;
        } catch { /* skip */ }
      }
      return null;
    })();

    if (!section) return [];

    const result: Array<{ name: string; endorsements?: number }> = [];
    const items = section.querySelectorAll(":scope > ul > li, ul.pvs-list > li");

    items.forEach((item) => {
      const spans = Array.from(item.querySelectorAll("span[aria-hidden='true']"))
        .map((s) => (s.textContent ?? "").trim())
        .filter(Boolean);
      if (!spans[0]) return;

      let endorsements: number | undefined;
      for (const span of spans) {
        const m = span.match(/^(\d+)\s+endorsement/i);
        if (m) { endorsements = parseInt(m[1], 10); break; }
      }
      result.push({ name: spans[0], endorsements });
    });

    return result;
  }) as SkillEntry[];

  const showAllLink = await page.$("a[href*='/details/skills']");
  log.done("skills", entries.length > 0, {
    count: entries.length,
    note: showAllLink ? "Show all skills link present" : undefined,
  });
  return entries;
};

// ─── Licenses ─────────────────────────────────────────────────────────────────

const extractLicenses = async (page: Page, log: Logger): Promise<LicenseEntry[]> => {
  log.start("licenses");

  const entries = await page.evaluate(() => {
    const section = (() => {
      for (const id of [
        "#licenses_and_certifications",
        "#licenses-and-certifications-section",
        "[id*='license']",
        "[id*='certification']",
      ]) {
        try {
          const el = document.querySelector(id);
          if (el) return el.closest("section") ?? el.parentElement;
        } catch { /* skip */ }
      }
      return null;
    })();

    if (!section) return [];

    const items = section.querySelectorAll(":scope > ul > li, ul.pvs-list > li");
    const result: Array<{
      name: string; issuingOrganization?: string; issueDate?: string;
      expirationDate?: string; credentialId?: string; credentialUrl?: string;
    }> = [];

    items.forEach((item) => {
      const spans = Array.from(item.querySelectorAll("span[aria-hidden='true']"))
        .map((s) => (s.textContent ?? "").trim())
        .filter(Boolean);
      if (!spans[0]) return;

      const entry: typeof result[number] = { name: spans[0] };
      if (spans[1]) entry.issuingOrganization = spans[1];

      for (const span of spans.slice(2)) {
        if (span.startsWith("Issued") || /^\w+ \d{4}/.test(span)) {
          entry.issueDate = entry.issueDate ?? span.replace("Issued", "").trim();
        } else if (span.startsWith("Expires")) {
          entry.expirationDate = span.replace(/Expires?/i, "").trim();
        } else if (span.startsWith("Credential ID")) {
          entry.credentialId = span.replace("Credential ID", "").trim();
        }
      }

      const link = item.querySelector("a[href*='credential']") as HTMLAnchorElement | null;
      if (link?.href) entry.credentialUrl = link.href;
      result.push(entry);
    });

    return result;
  }) as LicenseEntry[];

  log.done("licenses", entries.length > 0, { count: entries.length });
  return entries;
};

// ─── Languages ────────────────────────────────────────────────────────────────

const extractLanguages = async (page: Page, log: Logger): Promise<LanguageEntry[]> => {
  log.start("languages");

  const entries = await page.evaluate(() => {
    const section = (() => {
      for (const id of ["#languages", "#languages-section", "[id*='language']"]) {
        try {
          const el = document.querySelector(id);
          if (el) return el.closest("section") ?? el.parentElement;
        } catch { /* skip */ }
      }
      return null;
    })();

    if (!section) return [];

    const result: Array<{ name: string; proficiency?: string }> = [];
    const items = section.querySelectorAll(":scope > ul > li, ul.pvs-list > li");

    items.forEach((item) => {
      const spans = Array.from(item.querySelectorAll("span[aria-hidden='true']"))
        .map((s) => (s.textContent ?? "").trim())
        .filter(Boolean);
      if (spans[0]) result.push({ name: spans[0], proficiency: spans[1] || undefined });
    });

    return result;
  }) as LanguageEntry[];

  log.done("languages", entries.length > 0, { count: entries.length });
  return entries;
};

// ─── Volunteer ────────────────────────────────────────────────────────────────

const extractVolunteer = async (page: Page, log: Logger): Promise<VolunteerEntry[]> => {
  log.start("volunteer");

  const entries = await page.evaluate(() => {
    const section = (() => {
      for (const id of ["#volunteering_experience", "#volunteering-section", "[id*='volunteer']"]) {
        try {
          const el = document.querySelector(id);
          if (el) return el.closest("section") ?? el.parentElement;
        } catch { /* skip */ }
      }
      return null;
    })();

    if (!section) return [];

    const result: Array<{
      role: string; organization: string; cause?: string;
      startDate?: string; endDate?: string; current: boolean; description?: string;
    }> = [];

    const items = section.querySelectorAll(":scope > ul > li, ul.pvs-list > li");

    items.forEach((item) => {
      const spans = Array.from(item.querySelectorAll("span[aria-hidden='true']"))
        .map((s) => (s.textContent ?? "").trim())
        .filter(Boolean);
      if (!spans[0]) return;

      const dateRaw = spans[2] ?? "";
      const dateParts = dateRaw.split(/[-–]/).map((p: string) => p.trim());
      const current = dateRaw.includes("Present");

      result.push({
        role: spans[0],
        organization: spans[1] ?? "",
        cause: spans[3] || undefined,
        startDate: dateParts[0] || undefined,
        endDate: current ? undefined : dateParts[1] || undefined,
        current,
        description: spans.length > 4 ? spans[spans.length - 1] : undefined,
      });
    });

    return result;
  }) as VolunteerEntry[];

  log.done("volunteer", entries.length > 0, { count: entries.length });
  return entries;
};

// ─── Generic section extractor ────────────────────────────────────────────────

const extractGenericSection = async (
  page: Page,
  log: Logger,
  section: string,
  ids: string[],
): Promise<Array<{ spans: string[]; href?: string }>> => {
  log.start(section);

  const items = await page.evaluate((sectionIds: string[]) => {
    // IIFE receives sectionIds from the outer evaluate argument
    const sec = (() => {
      for (const id of sectionIds) {
        try {
          const el = document.querySelector(id);
          if (el) return el.closest("section") ?? el.parentElement;
        } catch { /* skip */ }
      }
      return null;
    })();

    if (!sec) return [];

    const result: Array<{ spans: string[]; href?: string }> = [];
    const listItems = sec.querySelectorAll(":scope > ul > li, ul.pvs-list > li");

    listItems.forEach((item) => {
      const spans = Array.from(item.querySelectorAll("span[aria-hidden='true']"))
        .map((s) => (s.textContent ?? "").trim())
        .filter(Boolean);
      const link = item.querySelector("a") as HTMLAnchorElement | null;
      if (spans.length) result.push({ spans, href: link?.href });
    });

    return result;
  }, ids);

  return items;
};

// ─── Organizations ────────────────────────────────────────────────────────────

const extractOrganizations = async (page: Page, log: Logger): Promise<OrganizationEntry[]> => {
  const raw = await extractGenericSection(page, log, "organizations", [
    "#organizations", "#organizations-section", "[id*='organization']",
  ]);
  const entries: OrganizationEntry[] = raw.map((item) => ({
    name: item.spans[0] ?? "",
    position: item.spans[1] || undefined,
    startDate: item.spans[2]?.split(/[-–]/)[0]?.trim() || undefined,
    endDate: item.spans[2]?.split(/[-–]/)[1]?.trim() || undefined,
  }));
  log.done("organizations", entries.length > 0, { count: entries.length });
  return entries;
};

// ─── Projects ─────────────────────────────────────────────────────────────────

const extractProjects = async (page: Page, log: Logger): Promise<ProjectEntry[]> => {
  const raw = await extractGenericSection(page, log, "projects", [
    "#projects", "#projects-section", "[id*='project']",
  ]);
  const entries: ProjectEntry[] = raw.map((item) => ({
    name: item.spans[0] ?? "",
    startDate: item.spans[1]?.split(/[-–]/)[0]?.trim() || undefined,
    endDate: item.spans[1]?.split(/[-–]/)[1]?.trim() || undefined,
    description: item.spans.length > 2 ? item.spans[item.spans.length - 1] : undefined,
    url: item.href,
  }));
  log.done("projects", entries.length > 0, { count: entries.length });
  return entries;
};

// ─── Publications ─────────────────────────────────────────────────────────────

const extractPublications = async (page: Page, log: Logger): Promise<PublicationEntry[]> => {
  const raw = await extractGenericSection(page, log, "publications", [
    "#publications", "#publications-section", "[id*='publication']",
  ]);
  const entries: PublicationEntry[] = raw.map((item) => ({
    title: item.spans[0] ?? "",
    publisher: item.spans[1] || undefined,
    date: item.spans[2] || undefined,
    description: item.spans[3] || undefined,
    url: item.href,
  }));
  log.done("publications", entries.length > 0, { count: entries.length });
  return entries;
};

// ─── Patents ──────────────────────────────────────────────────────────────────

const extractPatents = async (page: Page, log: Logger): Promise<PatentEntry[]> => {
  const raw = await extractGenericSection(page, log, "patents", [
    "#patents", "#patents-section", "[id*='patent']",
  ]);
  const entries: PatentEntry[] = raw.map((item) => ({
    title: item.spans[0] ?? "",
    patentOffice: item.spans[1] || undefined,
    patentNumber: item.spans[2] || undefined,
    status: item.spans[3] || undefined,
    date: item.spans[4] || undefined,
    description: item.spans[5] || undefined,
  }));
  log.done("patents", entries.length > 0, { count: entries.length });
  return entries;
};

// ─── Courses ──────────────────────────────────────────────────────────────────

const extractCourses = async (page: Page, log: Logger): Promise<CourseEntry[]> => {
  const raw = await extractGenericSection(page, log, "courses", [
    "#courses", "#courses-section", "[id*='course']",
  ]);
  const entries: CourseEntry[] = raw.map((item) => ({
    name: item.spans[0] ?? "",
    number: item.spans[1] || undefined,
    associatedWith: item.spans[2] || undefined,
  }));
  log.done("courses", entries.length > 0, { count: entries.length });
  return entries;
};

// ─── Awards ───────────────────────────────────────────────────────────────────

const extractAwards = async (page: Page, log: Logger): Promise<AwardEntry[]> => {
  const raw = await extractGenericSection(page, log, "awards", [
    "#honors_and_awards", "#awards", "#honors-and-awards-section",
    "[id*='honor']", "[id*='award']",
  ]);
  const entries: AwardEntry[] = raw.map((item) => ({
    title: item.spans[0] ?? "",
    issuedBy: item.spans[1] || undefined,
    issueDate: item.spans[2] || undefined,
    description: item.spans[3] || undefined,
  }));
  log.done("awards", entries.length > 0, { count: entries.length });
  return entries;
};

// ─── Recommendations ──────────────────────────────────────────────────────────

const extractRecommendations = async (page: Page, log: Logger): Promise<RecommendationEntry[]> => {
  log.start("recommendations");

  const entries = await page.evaluate(() => {
    const section = (() => {
      for (const id of ["#recommendations", "#recommendations-section", "[id*='recommendation']"]) {
        try {
          const el = document.querySelector(id);
          if (el) return el.closest("section") ?? el.parentElement;
        } catch { /* skip */ }
      }
      return null;
    })();

    if (!section) return [];

    const tabs = section.querySelectorAll("[role='tabpanel']");
    const target = tabs.length > 0 ? tabs[0] : section;
    const items = target.querySelectorAll(":scope > ul > li, ul.pvs-list > li");

    const result: Array<{
      recommenderName: string; recommenderHeadline?: string; recommenderUrl?: string;
      date?: string; text: string;
    }> = [];

    items.forEach((item) => {
      const spans = Array.from(item.querySelectorAll("span[aria-hidden='true']"))
        .map((s) => (s.textContent ?? "").trim())
        .filter(Boolean);
      if (!spans[0]) return;

      const link = item.querySelector("a[href*='/in/']") as HTMLAnchorElement | null;
      const reversed = [...spans].reverse();
      const text = reversed.find((s) => s.length > 30) ?? "";

      result.push({
        recommenderName: spans[0],
        recommenderHeadline: spans[1] || undefined,
        recommenderUrl: link?.href,
        date: spans[2] || undefined,
        text,
      });
    });

    return result;
  }) as RecommendationEntry[];

  log.done("recommendations", entries.length > 0, { count: entries.length });
  return entries;
};

// ─── Featured ─────────────────────────────────────────────────────────────────

const extractFeatured = async (page: Page, log: Logger): Promise<FeaturedEntry[]> => {
  log.start("featured");

  const entries = await page.evaluate(() => {
    const section = (() => {
      for (const id of ["#featured", "#featured-section", "[id*='featured']"]) {
        try {
          const el = document.querySelector(id);
          if (el) return el.closest("section") ?? el.parentElement;
        } catch { /* skip */ }
      }
      return null;
    })();

    if (!section) return [];

    const items = section.querySelectorAll(
      ":scope > ul > li, ul.pvs-list > li, .pv-featured-section__list-item",
    );
    const result: Array<{
      type: string; title?: string; description?: string;
      url?: string; thumbnailUrl?: string;
    }> = [];

    items.forEach((item) => {
      const link = item.querySelector("a") as HTMLAnchorElement | null;
      const url = link?.href;
      const spans = Array.from(item.querySelectorAll("span[aria-hidden='true']"))
        .map((s) => (s.textContent ?? "").trim())
        .filter(Boolean);
      const thumb = item.querySelector("img") as HTMLImageElement | null;

      // inferType inlined — no named binding
      let type = "link";
      if (url) {
        if (url.includes("linkedin.com/posts/") || url.includes("linkedin.com/feed/")) type = "post";
        else if (url.includes("linkedin.com/pulse/") || url.includes("linkedin.com/article/")) type = "article";
        else if (spans[0]?.toLowerCase().includes("article")) type = "article";
      }

      result.push({
        type,
        title: spans[0] || undefined,
        description: spans[1] || undefined,
        url: url || undefined,
        thumbnailUrl: thumb?.src || undefined,
      });
    });

    return result;
  }) as FeaturedEntry[];

  log.done("featured", entries.length > 0, { count: entries.length });
  return entries;
};

// ─── Posts / Activity ─────────────────────────────────────────────────────────

const extractPosts = async (page: Page, log: Logger): Promise<PostEntry[]> => {
  log.start("posts");

  const entries = await page.evaluate(() => {
    const section = (() => {
      for (const id of ["#recent-activity-reshares", "#recent-activity-all", "#activity", "[id*='activity']"]) {
        try {
          const el = document.querySelector(id);
          if (el) return el.closest("section") ?? el.parentElement;
        } catch { /* skip */ }
      }
      // header-based fallback
      const headers = Array.from(document.querySelectorAll("h2, h3"));
      const activityHeader = headers.find((h) => (h.textContent ?? "").toLowerCase().includes("activity"));
      return activityHeader?.closest("section") ?? null;
    })();

    if (!section) return [];

    const cards = section.querySelectorAll(
      ".social-content-aggregator-entity, .feed-shared-update-v2, li",
    );

    const result: Array<{
      content?: string; postedAt?: string; likes?: number; comments?: number;
      mediaType?: string; articleTitle?: string; articleUrl?: string;
    }> = [];

    cards.forEach((card) => {
      const textEl = card.querySelector(
        ".feed-shared-text span[dir='ltr'], span.break-words, span[aria-hidden='true']",
      );
      const content = (textEl?.textContent ?? "").trim() || undefined;

      const timeEl = card.querySelector("time");
      const postedAt = (timeEl?.getAttribute("datetime") ?? (timeEl?.textContent ?? "").trim()) || undefined;

      const likeEl = card.querySelector("button[aria-label*='reaction'], .social-counts-reactions__count");
      const commentEl = card.querySelector("button[aria-label*='comment'], .social-counts-comments");
      const articleLink = card.querySelector(".feed-shared-article__link") as HTMLAnchorElement | null;
      const articleTitleEl = card.querySelector(".feed-shared-article__title");

      const hasVideo = !!card.querySelector("video");
      const hasImage = !!card.querySelector("img.feed-shared-image__image");
      let mediaType: string | undefined;
      if (hasVideo) mediaType = "video";
      else if (articleLink) mediaType = "article";
      else if (hasImage) mediaType = "image";

      // parseCount inlined
      const likeText = (likeEl?.textContent ?? "").trim();
      const likeM = likeText.match(/[\d,]+/);
      const likes = likeM ? parseInt(likeM[0].replace(/,/g, ""), 10) : undefined;

      const commentText = (commentEl?.textContent ?? "").trim();
      const commentM = commentText.match(/[\d,]+/);
      const comments = commentM ? parseInt(commentM[0].replace(/,/g, ""), 10) : undefined;

      if (content || articleLink) {
        result.push({
          content,
          postedAt,
          likes,
          comments,
          mediaType,
          articleTitle: (articleTitleEl?.textContent ?? "").trim() || undefined,
          articleUrl: articleLink?.href,
        });
      }
    });

    return result.slice(0, 20);
  }) as PostEntry[];

  log.done("posts", entries.length > 0, { count: entries.length });
  return entries;
};

// ─── Interests ────────────────────────────────────────────────────────────────

const extractInterests = async (page: Page, log: Logger): Promise<InterestEntry[]> => {
  const raw = await extractGenericSection(page, log, "interests", [
    "#interests", "#interests-section", "[id*='interest']",
  ]);

  const entries: InterestEntry[] = raw.map((item) => {
    const href = item.href;
    let type: InterestEntry["type"] = "other";
    if (href) {
      if (href.includes("/company/")) type = "company";
      else if (href.includes("/school/")) type = "school";
      else if (href.includes("/in/")) type = "person";
      else if (href.includes("/newsletter/")) type = "newsletter";
      else if (href.includes("/groups/")) type = "group";
    }
    return { type, name: item.spans[0] ?? "", followers: item.spans[1] || undefined };
  });

  log.done("interests", entries.length > 0, { count: entries.length });
  return entries;
};

// ─── Causes ───────────────────────────────────────────────────────────────────

const extractCauses = async (page: Page, log: Logger): Promise<string[]> => {
  log.start("causes");

  // No named inner functions → safe
  const causes = await page.evaluate(() => {
    for (const id of ["#causes", "[id*='cause']"]) {
      try {
        const el = document.querySelector(id);
        if (!el) continue;
        const section = el.closest("section") ?? el.parentElement;
        if (!section) continue;
        const spans = Array.from(section.querySelectorAll("span[aria-hidden='true']"))
          .map((s) => (s.textContent ?? "").trim())
          .filter(Boolean);
        if (spans.length) return spans;
      } catch { /* skip */ }
    }
    return [];
  });

  log.done("causes", causes.length > 0, { count: causes.length });
  return causes;
};

// ─── Groups ───────────────────────────────────────────────────────────────────

const extractGroups = async (page: Page, log: Logger): Promise<{ name: string; url?: string }[]> => {
  const raw = await extractGenericSection(page, log, "groups", [
    "#groups", "[id*='group']",
  ]);
  const entries = raw
    .filter((i) => i.spans[0])
    .map((i) => ({ name: i.spans[0] ?? "", url: i.href }));
  log.done("groups", entries.length > 0, { count: entries.length });
  return entries;
};

// ─── Completeness score ───────────────────────────────────────────────────────

const calculateCompletenessScore = (profile: Omit<NormalizedProfile, "completenessScore">): number => {
  let score = 0;
  if (profile.profilePhoto) score += 5;
  if (profile.headline) score += 5;
  if (profile.about && profile.about.length > 20) score += 10;
  if (profile.experience.length > 0) score += 20;
  if (profile.education.length > 0) score += 10;
  if (profile.skills.length > 0) score += 10;
  if (profile.posts.length > 0) score += 15;
  if (profile.recommendations.length > 0) score += 10;
  if (profile.languages.length > 0) score += 5;
  if (profile.featured.length > 0) score += 10;
  return Math.min(score, 100);
};

// ─── Screenshot on failure ────────────────────────────────────────────────────

const saveFailureArtifacts = async (
  page: Page,
  jobId: string,
  error: Error,
): Promise<string | undefined> => {
  try {
    if (!fs.existsSync(SCREENSHOTS_DIR)) {
      fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
    }
    const ts = Date.now();
    const baseName = `${jobId}-${ts}`;
    const screenshotPath = path.join(SCREENSHOTS_DIR, `${baseName}.png`);
    const domPath = path.join(SCREENSHOTS_DIR, `${baseName}.html`);
    const errorPath = path.join(SCREENSHOTS_DIR, `${baseName}.json`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    const html = await page.content().catch(() => "");
    fs.writeFileSync(domPath, html);
    fs.writeFileSync(errorPath, JSON.stringify({
      url: page.url(), error: error.message, timestamp: new Date().toISOString(),
    }));
    console.log(`[collector] Saved failure artifacts → ${baseName}`);
    return screenshotPath;
  } catch {
    return undefined;
  }
};

// ─── Auth checks ──────────────────────────────────────────────────────────────

const isAuthWall = (url: string): boolean =>
  url.includes("/login") || url.includes("/authwall") ||
  url.includes("/checkpoint") || url.includes("uas/authenticate");

const isRateLimited = (url: string): boolean =>
  url.includes("/in/unavailable") || url.includes("429");

// ─── Main orchestrator ────────────────────────────────────────────────────────

const scrapeProfile = async (page: Page, log: Logger): Promise<NormalizedProfile> => {
  const topCard = await extractTopCard(page, log);
  const about = await extractAbout(page, log);
  const experience = await extractExperience(page, log);
  const education = await extractEducation(page, log);
  const skills = await extractSkills(page, log);
  const licenses = await extractLicenses(page, log);
  const languages = await extractLanguages(page, log);
  const volunteer = await extractVolunteer(page, log);
  const organizations = await extractOrganizations(page, log);
  const projects = await extractProjects(page, log);
  const publications = await extractPublications(page, log);
  const patents = await extractPatents(page, log);
  const courses = await extractCourses(page, log);
  const awards = await extractAwards(page, log);
  const recommendations = await extractRecommendations(page, log);
  const featured = await extractFeatured(page, log);
  const posts = await extractPosts(page, log);
  const interests = await extractInterests(page, log);
  const causes = await extractCauses(page, log);
  const groups = await extractGroups(page, log);

  const currentJob = experience.find((e) => e.current);

  const partial: Omit<NormalizedProfile, "completenessScore"> = {
    profilePhoto: topCard.profilePhoto,
    bannerImage: topCard.bannerImage,
    name: topCard.name,
    headline: topCard.headline,
    location: topCard.location,
    company: topCard.company ?? currentJob?.company,
    companyUrl: topCard.companyUrl ?? currentJob?.companyUrl,
    industry: undefined,
    followers: topCard.followers,
    connections: topCard.connections,
    creatorMode: topCard.creatorMode ?? false,
    about,
    experience,
    education,
    skills,
    licenses,
    certifications: [],
    languages,
    volunteer,
    organizations,
    projects,
    awards,
    patents,
    publications,
    courses,
    causes,
    groups,
    interests,
    recommendations,
    featured,
    posts,
  };

  const completenessScore = calculateCompletenessScore(partial);
  log.done("completenessScore", true, { note: `score=${completenessScore}` });
  return { ...partial, completenessScore };
};

// ─── Public entry point ───────────────────────────────────────────────────────

export const collectLinkedInProfile = async (
  linkedinUrl: string,
  jobId?: string,
): Promise<CollectorResult> => {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const page = await browserManager.newPage();
    const log = new Logger();
    const attemptLabel = attempt > 0 ? ` (retry ${attempt})` : "";
    console.log(`[collector] Starting research${attemptLabel}: ${linkedinUrl}`);

    try {
      const t0 = Date.now();

      await page.goto(linkedinUrl, {
        waitUntil: "domcontentloaded",
        timeout: NAVIGATION_TIMEOUT,
      });

      const currentUrl = page.url();
      console.log(`[collector] Loaded: ${currentUrl}`);

      if (isAuthWall(currentUrl)) {
        throw new Error(
          "LinkedIn requires authentication. Log in through the browser profile and restart the backend.",
        );
      }
      if (isRateLimited(currentUrl)) {
        throw new Error("LinkedIn rate-limited this request. Try again in a few minutes.");
      }

      // Detect soft auth wall: URL stays correct but page shows unauthenticated content.
      // No named inner function → safe from __name injection.
      const isSoftAuthWall = await page.evaluate(() => {
        const h1 = document.querySelector("h1");
        const title = document.title ?? "";
        const h1Text = (h1?.textContent ?? "").trim();
        return (
          h1Text.toLowerCase().includes("join linkedin") ||
          title.toLowerCase().includes("log in") ||
          !!document.querySelector(".authwall-join-form, .join-form, [data-id='authwall']")
        );
      });

      if (isSoftAuthWall) {
        throw new Error(
          "LinkedIn requires authentication. Log in through the browser profile and restart the backend.",
        );
      }

      await dismissModals(page);

      console.log("[collector] Scrolling to load all sections…");
      await scrollToBottom(page);

      const expanded = await expandSeeMore(page);
      if (expanded > 0) {
        console.log(`[collector] Expanded ${expanded} "See more" buttons`);
        await page.waitForTimeout(500);
      }

      const profile = await scrapeProfile(page, log);

      console.log(`[collector] Done in ${Date.now() - t0}ms — score=${profile.completenessScore}`);
      await page.close();

      return {
        profile,
        scrapedAt: new Date().toISOString(),
        debugLog: log.entries,
      };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.error(`[collector] Error on attempt ${attempt}: ${lastError.message}`);

      if (
        lastError.message.includes("authentication") ||
        lastError.message.includes("rate-limited")
      ) {
        const screenshotPath = jobId
          ? await saveFailureArtifacts(page, jobId, lastError)
          : undefined;
        await page.close().catch(() => undefined);
        throw Object.assign(lastError, { screenshotPath });
      }

      if (attempt === MAX_RETRIES && jobId) {
        const screenshotPath = await saveFailureArtifacts(page, jobId, lastError);
        await page.close().catch(() => undefined);
        throw Object.assign(lastError, { screenshotPath });
      }

      await page.close().catch(() => undefined);
      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, 3000));
      }
    }
  }

  throw lastError ?? new Error("Failed to collect LinkedIn profile after retries");
};
