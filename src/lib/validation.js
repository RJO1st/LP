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
  question: z.string().max(2000).optional(),
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
