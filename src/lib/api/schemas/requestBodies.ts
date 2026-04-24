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
