import { z } from "zod";
import type { HomeSiteContent } from "@/lib/siteContent";

const pillSchema = z.object({
  id: z.string().trim().min(1).max(64),
  label: z.string().trim().min(1).max(200),
  tone: z.enum(["blue", "amber", "neutral"]),
  icon: z.enum(["calendar", "archive", "mapPin", "clock"]),
});

export const homeSiteContentSchema = z.object({
  discordInviteUrl: z.string().trim().url().max(500),
  discordLinkLabel: z.string().trim().min(1).max(120),
  announcementBanner: z.object({
    enabled: z.boolean(),
    text: z.string().trim().min(1).max(200),
  }),
  pastCohortsCta: z.object({
    enabled: z.boolean(),
    label: z.string().trim().min(1).max(120),
    href: z.string().trim().min(1).max(200),
  }),
  terminal: z.object({
    filename: z.string().trim().min(1).max(120),
    lines: z.array(z.string().trim().min(1).max(300)).min(1).max(12),
  }),
  cohortPills: z.array(pillSchema).min(1).max(8),
  joinCohortBanner: z.object({
    title: z.string().trim().min(1).max(200),
    body: z.string().trim().min(1).max(800),
    buttonLabel: z.string().trim().min(1).max(80),
    successJoined: z.string().trim().min(1).max(200),
    successAlready: z.string().trim().min(1).max(200),
  }),
  kickoffCta: z.object({
    partnersLabel: z.string().trim().min(1).max(200),
    headline: z.string().trim().min(1).max(200),
    dateLine: z.string().trim().min(1).max(120),
    locationLine: z.string().trim().min(1).max(300),
  }),
  stats: z.object({
    weeksValue: z.string().trim().min(1).max(20),
    projectsValue: z.string().trim().min(1).max(20),
    activeAttendeesValue: z.string().trim().min(1).max(20),
  }),
  scheduleSubtitle: z.string().trim().min(1).max(200),
});

export type HomeSiteContentInput = z.infer<typeof homeSiteContentSchema>;

export function toHomeSiteContent(input: HomeSiteContentInput): HomeSiteContent {
  return { ...input };
}
