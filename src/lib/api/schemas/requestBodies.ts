import { z } from "zod";

/** Accepts typical form / JSON scalars and normalizes to string. */
const stringish = z
  .union([z.string(), z.number(), z.boolean(), z.null(), z.undefined()])
  .transform((v) => (v == null ? "" : String(v)));

export const selfCheckInBodySchema = z.object({
  sessionId: z.string().min(1).max(200).transform((s) => s.trim()),
  code: z
    .string()
    .max(64)
    .refine((s) => s.trim().length > 0, { message: "code is required" }),
});

export const attendanceAdminPatchSchema = z.object({
  sessionId: z.string().min(1).max(200).transform((s) => s.trim()),
  attended: z.boolean(),
});

/** PATCH /api/users/[uid] — shape is open; unknown keys are still dropped in the route. */
export const userPatchBodySchema = z
  .record(z.string(), z.unknown())
  .refine((o) => Object.keys(o).length > 0, { message: "No valid fields to update" })
  .refine((o) => Object.keys(o).length <= 80, { message: "Too many fields" })
  .refine((o) => Object.keys(o).every((k) => k.length > 0 && k.length <= 120), {
    message: "Invalid field name",
  });

export const pendingUserBodySchema = z
  .object({
    email: stringish
      .pipe(z.string().min(3).max(320))
      .transform((s) => s.toLowerCase().trim()),
    displayName: stringish.optional(),
    handle: stringish.optional(),
    location: stringish.optional(),
    city: stringish.optional(),
    country: stringish.optional(),
    formRole: stringish.optional(),
    yearsOfExperience: stringish.optional(),
    priorAIKnowledge: stringish.optional(),
    areasOfInterest: stringish.optional(),
    whyJoin: stringish.optional(),
    joiningInPerson: stringish.optional(),
    knowsProgramming: z.boolean().optional(),
    commitment: z.boolean().optional(),
    role: z.enum(["admin", "moderator", "attendee", ""]).optional(),
    formSubmittedAt: stringish.optional(),
    importCreatedAt: stringish.optional(),
  })
  .refine((b) => b.email.includes("@"), {
    message: "Valid email is required",
    path: ["email"],
  });

export const assignmentCreateSchema = z.object({
  weekNumber: z.coerce.number().int().min(1).max(52),
  sessionId: z.string().max(200).optional().default(""),
  title: z.coerce.string().trim().min(1).max(500),
  description: z.coerce.string().trim().min(1).max(20000),
  githubUrl: z.string().max(2000).optional().default(""),
  notebookUrl: z.string().max(2000).optional().default(""),
  demoUrl: z.string().max(2000).optional().default(""),
});

export const assignmentAdminPatchSchema = z
  .object({
    status: z.enum(["submitted", "reviewed", "approved"]).optional(),
    feedback: z.string().max(20000).optional(),
    grade: z.string().max(500).optional(),
  })
  .strict()
  .refine(
    (d) => d.status !== undefined || d.feedback !== undefined || d.grade !== undefined,
    { message: "At least one of status, feedback, or grade is required" }
  );

export const projectCreateSchema = z.object({
  title: z.coerce.string().trim().min(1).max(500),
  description: z.coerce.string().trim().min(1).max(20000),
  techStack: z
    .unknown()
    .optional()
    .transform((v) => {
      if (!Array.isArray(v)) return [];
      return v
        .filter((x): x is string => typeof x === "string")
        .map((s) => s.slice(0, 120))
        .slice(0, 200);
    }),
  githubUrl: z.string().max(2000).optional().default(""),
  demoUrl: z.string().max(2000).optional().default(""),
  weekCompleted: z.coerce.number().int().min(1).max(52).optional().default(4),
});

export const projectAdminPatchSchema = z
  .object({
    status: z.enum(["submitted", "reviewed", "shortlisted", "winner", "passed"]).optional(),
    feedback: z.string().max(20000).optional(),
  })
  .strict()
  .refine(
    (d) => d.status !== undefined || d.feedback !== undefined,
    { message: "At least one of status or feedback is required" }
  );

function normalizeLearningTaskCategoryInput(raw: string): string {
  return raw.trim().replace(/\s+/g, " ").slice(0, 80);
}

/** Task/template category — user-defined labels allowed (presets remain convention only). */
const learningCategorySchema = z.coerce
  .string()
  .transform((s) => normalizeLearningTaskCategoryInput(s))
  .refine((s) => s.length >= 1, { message: "category is required" });
const learningPrioritySchema = z.enum(["low", "medium", "high"]);
const learningProgressSchema = z.enum(["not_started", "in_progress", "done"]);

function normalizeDueDateInput(v: unknown): string | null {
  if (v === null || v === "") return null;
  if (typeof v !== "string") return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** POST: omit or empty → null */
const learningDueDateCreate = z
  .union([z.string(), z.null()])
  .optional()
  .transform((v) => {
    if (v === undefined || v === null || v === "") return null;
    return normalizeDueDateInput(v);
  });

/** PATCH: omit → undefined (no change); null → clear */
const learningDueDatePatch = z
  .union([z.string(), z.null()])
  .optional()
  .transform((v) => {
    if (v === undefined) return undefined;
    if (v === null || v === "") return null;
    return normalizeDueDateInput(v);
  });

export const learningTaskCreateSchema = z.object({
  title: z.coerce.string().trim().min(1).max(500),
  sessionKey: z.coerce.string().trim().min(1).max(120).default("general"),
  sessionLabel: z.coerce.string().trim().min(1).max(200).default("General"),
  sessionOrder: z.coerce.number().int().min(0).max(999).optional(),
  category: learningCategorySchema.optional().default("other"),
  priority: learningPrioritySchema.optional().default("medium"),
  progress: learningProgressSchema.optional().default("not_started"),
  dueDate: learningDueDateCreate,
  notes: z.coerce.string().trim().max(5000).optional().default(""),
  sortOrder: z.coerce.number().int().min(0).max(1_000_000).optional(),
  sourceTemplateId: z.union([z.string().min(1).max(200), z.null()]).optional(),
});

export const learningTaskPatchSchema = z
  .object({
    title: z.coerce.string().trim().min(1).max(500).optional(),
    sessionKey: z.coerce.string().trim().min(1).max(120).optional(),
    sessionLabel: z.coerce.string().trim().min(1).max(200).optional(),
    sessionOrder: z.coerce.number().int().min(0).max(999).optional(),
    category: learningCategorySchema.optional(),
    priority: learningPrioritySchema.optional(),
    progress: learningProgressSchema.optional(),
    dueDate: learningDueDatePatch,
    notes: z.coerce.string().trim().max(5000).optional(),
    sortOrder: z.coerce.number().int().min(0).max(1_000_000).optional(),
  })
  .strict()
  .refine((d) => Object.keys(d).length > 0, { message: "No valid fields to update" });

export const learningTaskTemplateCreateSchema = z.object({
  sessionKey: z.coerce.string().trim().min(1).max(120),
  sessionLabel: z.coerce.string().trim().min(1).max(200),
  sessionOrder: z.coerce.number().int().min(0).max(999),
  title: z.coerce.string().trim().min(1).max(500),
  category: learningCategorySchema,
  sortOrder: z.coerce.number().int().min(0).max(1_000_000),
  active: z.coerce.boolean().optional().default(true),
});

/** Admin POST — optional stable Firestore document id */
export const learningTaskTemplateAdminCreateSchema = learningTaskTemplateCreateSchema.extend({
  id: z.coerce.string().trim().min(1).max(200).optional(),
});

export const learningTaskTemplatePatchSchema = z
  .object({
    sessionKey: z.coerce.string().trim().min(1).max(120).optional(),
    sessionLabel: z.coerce.string().trim().min(1).max(200).optional(),
    sessionOrder: z.coerce.number().int().min(0).max(999).optional(),
    title: z.coerce.string().trim().min(1).max(500).optional(),
    category: learningCategorySchema.optional(),
    sortOrder: z.coerce.number().int().min(0).max(1_000_000).optional(),
    active: z.coerce.boolean().optional(),
  })
  .strict()
  .refine((d) => Object.keys(d).length > 0, { message: "No valid fields to update" });

export const learningTaskImportSchema = z
  .object({
    templateIds: z.array(z.string().min(1).max(200)).max(100).optional(),
    importAllActive: z.boolean().optional(),
  })
  .strict()
  .refine((b) => (b.templateIds?.length ?? 0) > 0 || b.importAllActive === true, {
    message: "Provide templateIds or set importAllActive to true",
  });

export const buddyRequestCreateSchema = z.object({
  toUid: z.string().trim().min(1).max(128),
});

export const buddyRequestPatchSchema = z.object({
  action: z.enum(["accept", "reject"]),
});
