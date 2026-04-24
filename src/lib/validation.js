import { z } from 'zod'

// Scholar ID is a UUID
export const scholarIdSchema = z.string().uuid()

// Subject names
export const subjectSchema = z.enum([
  'mathematics', 'english', 'science', 'english_language', 'english_literature',
  'basic_science', 'maths', 'biology', 'chemistry', 'physics', 'history',
  'geography', 'civic_education', 'english_studies', 'nvr', 'vr', 'computing',
  'civics'
])

// Year levels
export const yearLevelSchema = z.number().int().min(1).max(13)

// Tara request
export const taraRequestSchema = z.object({
  text: z.string().min(1).max(4000),
  subject: z.string().max(50).optional(),
  correctAnswer: z.string().max(500).optional(),
  question: z.unknown().optional(), // question_bank object — not a plain string
  scholarName: z.string().max(100).optional(),
  scholarYear: yearLevelSchema.optional(),
  mode: z.enum(['eib', 'followup']).optional(),
  // Optional — enables server-side monthly quota enforcement. If absent,
  // quota check is skipped (fail-open) so existing clients don't break.
  scholarId: scholarIdSchema.optional(),
})

// Mastery update
export const masteryUpdateSchema = z.object({
  scholar_id: scholarIdSchema,
  subject: z.string().max(50),
  topic: z.string().max(100),
  correct: z.boolean(),
  standard_code: z.string().max(50).optional(),
  total_standards_for_topic: z.number().int().min(0).optional(),
})

// Quest submission
export const submitQuestSchema = z.object({
  subject: z.string().max(50),
  answers: z.array(z.object({
    selectedOption: z.string().max(1000),
    correctOption: z.string().max(1000),
  })).max(100),
  timeSpent: z.number().min(0).max(7200),
})

// Exam sitting answer
export const submitAnswerSchema = z.object({
  action: z.literal('submit_answer'),
  question_id: z.string().uuid(),
  answer_text: z.string().max(10000),
  flagged: z.boolean().optional(),
  time_spent: z.number().int().min(0).max(7200).optional(),
})

// Finish exam sitting
export const finishSittingSchema = z.object({
  action: z.literal('finish'),
})

// Validate submission
export const validateSubmissionSchema = z.object({
  question: z.string().max(2000),
  answer: z.string().max(10000),
  subject: z.string().max(50).optional(),
  year: yearLevelSchema.optional(),
})

// Chat request (system prompt + messages array)
export const chatRequestSchema = z.object({
  system: z.string().max(8000).optional(),
  messages: z.array(
    z.object({
      role: z.enum(['user', 'assistant', 'system']),
      content: z.string().max(8000),
    })
  ).min(1).max(50),
})

// Scholar access-code login
export const scholarLoginSchema = z.object({
  code: z.string().min(4).max(20).regex(/^[A-Za-z0-9]+$/, 'Access code must be alphanumeric'),
})

// Start exam sitting
export const startSittingSchema = z.object({
  exam_paper_id: z.string().uuid(),
  mode: z.enum(['timed', 'practice', 'topic_focus', 'review']),
  scholar_id: z.string().uuid(),
})

// Remediation request
export const remediateSchema = z.object({
  skill_topic: z.string().min(1).max(200),
  wrong_answer: z.string().max(1000).optional(),
})

// NPS survey submission
export const npsSchema = z.object({
  score:      z.number().int().min(0).max(10),
  comment:    z.string().max(500).optional(),
  curriculum: z.string().max(50).optional(),
})

// Save quest result (save-result/route.js)
export const saveResultSchema = z.object({
  scholarId: scholarIdSchema,
  subject: z.string().min(1).max(50),
  score: z.number().int().min(0).max(10000),
  totalQuestions: z.number().int().min(1).max(200),
  answers: z.array(
    z.object({
      question: z.string().max(2000).optional(),
      selected: z.string().max(1000).optional(),
      correct: z.string().max(1000).optional(),
      isCorrect: z.boolean().optional(),
    }).passthrough()  // allow additional fields without stripping
  ).max(200).optional(),
})

// ─── School / consent / enrolment schemas ─────────────────────────────────
// Added April 23 2026 — Task #25 (extend Zod coverage to mutating routes).
// Manual ad-hoc validation in these routes has drifted; centralising here so
// we get consistent 422 shapes and length caps across the fleet.

// POST /api/parent/claim-scholar — parent redeems a school validation code.
// Code is alphanumeric ASCII per the import script; we keep the regex loose
// enough to tolerate hyphens in case a school hand-issues prettier codes.
export const claimScholarSchema = z.object({
  validation_code: z.string().trim().min(1).max(64),
})

// POST /api/parent/consent — give NDPR consent for a school.
export const parentConsentGiveSchema = z.object({
  scholar_id: scholarIdSchema,
  school_id: z.string().uuid(),
})

// DELETE /api/parent/consent — revoke consent, optional reason.
export const parentConsentRevokeSchema = z.object({
  scholar_id: scholarIdSchema,
  school_id: z.string().uuid(),
  reason: z.string().max(500).optional(),
})

// POST /api/classes/join — parent redeems a class join code for a scholar.
// Codes are 6-char uppercase tokens generated by the school, we accept 4–16
// alphanumerics to leave room for future format changes.
export const classJoinSchema = z.object({
  code: z.string().trim().min(4).max(16).regex(/^[A-Za-z0-9]+$/, 'Join code must be alphanumeric'),
  scholarId: scholarIdSchema,
})

// POST /api/push/subscribe — store a Web Push subscription.
// The `subscription` object is the raw PushSubscription JSON from the browser.
// Endpoint URLs from push services can be quite long (FCM can be 500+ chars).
export const pushSubscribeSchema = z.object({
  subscription: z.object({
    endpoint: z.string().url().max(2000),
    keys: z.object({
      p256dh: z.string().max(200).optional(),
      auth: z.string().max(200).optional(),
    }).optional(),
  }),
  scholarId: scholarIdSchema.optional(),
})

// DELETE /api/push/subscribe — remove a subscription by endpoint.
export const pushUnsubscribeSchema = z.object({
  endpoint: z.string().url().max(2000),
})

// POST /api/push/send — cron-secret protected dispatch.
// Either userId or scholarId must be present, enforced at the route level
// since Zod refines cross-field logic awkwardly here and we'd rather keep
// the schema flat for readability.
export const pushSendSchema = z.object({
  userId: z.string().uuid().optional(),
  scholarId: scholarIdSchema.optional(),
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(1000),
  url: z.string().max(500).optional(),
  icon: z.string().max(500).optional(),
})

// POST /api/forgot-password — lenient schema: callers expect GENERIC_RESPONSE
// on bad input to preserve enumeration resistance, so the route uses safeParse
// and swallows errors into the generic 200 path rather than 422ing.
export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(320),
})

// POST /api/forgot-access-code — same enumeration-resistance caveat as above.
export const forgotAccessCodeSchema = z.object({
  parentEmail: z.string().trim().toLowerCase().email().max(320),
})

// POST /api/schools/interest — public lead-capture form. Length caps mirror
// MAX_LEN in the route; studentCount tolerates string or number because the
// HTML form posts either.
export const schoolInterestSchema = z.object({
  schoolName: z.string().trim().min(1).max(200),
  contactName: z.string().trim().max(120).optional().or(z.literal('')),
  email: z.string().trim().toLowerCase().email().max(320),
  phone: z.string().trim().max(40).optional().or(z.literal('')),
  state: z.string().trim().max(80).optional().or(z.literal('')),
  studentCount: z.union([
    z.number().int().min(0).max(100_000),
    z.string().trim().regex(/^\d{0,6}$/).transform((s) => s === '' ? undefined : parseInt(s, 10)),
    z.literal(''),
    z.undefined(),
    z.null(),
  ]).optional(),
})

// POST /api/schools/onboard — proprietor creates the first class during the
// onboarding wizard. Curriculum is a free-form string (we have 7 curricula
// and counting; an enum would need churn every time we add one). Year level
// is 1–13 to cover all UK + NG school years.
export const schoolOnboardSchema = z.object({
  schoolId: z.string().uuid(),
  className: z.string().trim().min(1).max(100),
  curriculum: z.string().trim().min(1).max(50),
  yearLevel: z.number().int().min(1).max(13),
})

// POST /api/schools/create — dual-mode route:
//   (a) Claim mode: { schoolId } — admin pre-created the school, just link role
//   (b) Create mode: { name, schoolType?, state?, country? }
// Branching is enforced at the route (not Zod) because a `refine` here would
// produce fuzzy error messages; the route gives a clear "name required" 400.
export const schoolCreateSchema = z.object({
  name: z.string().trim().max(200).optional(),
  schoolType: z.string().trim().max(80).optional().or(z.literal('')).or(z.null()),
  state: z.string().trim().max(80).optional().or(z.literal('')).or(z.null()),
  country: z.string().trim().max(80).optional().or(z.literal('')).or(z.null()),
  schoolId: z.string().uuid().optional(),
})

// POST /api/teacher/notify-parent — teacher sends claim/progress email.
// classId is required for the teacher_assignments access check; teacherNote
// is escaped in the route before HTML interpolation, but we still cap length
// so an attacker can't pad it to inflate our Resend bill.
export const teacherNotifyParentSchema = z.object({
  scholarId: scholarIdSchema,
  classId: z.string().uuid(),
  teacherNote: z.string().max(1000).optional().or(z.literal('')),
})

// POST /api/admin/schools/provision — admin-only provisioning endpoint.
// requireAdmin() gates the request, so these are the post-auth field checks.
// proprietorEmail is lowercased + trimmed to match the Supabase auth admin
// API expectations; schoolName is the one required field beyond email.
export const adminSchoolProvisionSchema = z.object({
  schoolName: z.string().trim().min(1).max(200),
  schoolType: z.string().trim().max(80).optional().or(z.literal('')).or(z.null()),
  state: z.string().trim().max(80).optional().or(z.literal('')).or(z.null()),
  country: z.string().trim().max(80).optional().or(z.literal('')).or(z.null()),
  proprietorEmail: z.string().trim().toLowerCase().email().max(320),
})

// Helper to parse and validate request body
export function parseBody(schema, body) {
  const result = schema.safeParse(body)
  if (!result.success) {
    return {
      success: false,
      error: Response.json(
        { error: 'Invalid request', details: result.error.flatten() },
        { status: 422 }
      )
    }
  }
  return { success: true, data: result.data }
}
