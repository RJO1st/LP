/**
 * lib/email.js
 * Deploy to: src/lib/email.js
 *
 * Unified Brevo transactional email sender.
 * Updated for @getbrevo/brevo v2 API (Brevo / BrevoEnvironment classes).
 *
 * OLD v1 API (broken):
 *   new brevo.TransactionalEmailsApi()
 *   brevo.TransactionalEmailsApiApiKeys.apiKey
 *   new brevo.SendSmtpEmail()
 *
 * NEW v2 API (correct):
 *   new brevo.Brevo({ apiKey: '...' })
 *   client.sendTransacEmail({ sender, to, subject, htmlContent })
 */

const BREVO_SENDER = { email: 'hello@launchpard.com', name: 'LaunchPard' };
const BREVO_REPLY  = 'support@launchpard.com';

function getBrevoClient() {
  if (!process.env.BREVO_API_KEY) {
    throw new Error('BREVO_API_KEY is not set. Add it to your Vercel env vars.');
  }
  // Dynamic require — server-only, avoids ESM static analysis of old class names
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const brevo = require('@getbrevo/brevo');
  // v2 exposes `Brevo` as the main class
  return new brevo.Brevo({ apiKey: process.env.BREVO_API_KEY });
}

/**
 * sendEmail({ to, subject, html, htmlContent, from, replyTo })
 *
 * @param {string|{email,name?}|Array} to
 * @param {string} subject
 * @param {string} [html]         alias for htmlContent
 * @param {string} [htmlContent]
 * @param {string} [from]         defaults to hello@launchpard.com
 * @param {string} [replyTo]      defaults to support@launchpard.com
 */
export async function sendEmail({
  to,
  subject,
  html,
  htmlContent,
  from    = BREVO_SENDER.email,
  replyTo = BREVO_REPLY,
}) {
  const recipients = normaliseRecipients(to);
  if (!recipients.length) throw new Error('sendEmail: no valid recipients');

  const body = htmlContent ?? html;
  if (!body) throw new Error('sendEmail: no html/htmlContent supplied');

  const client = getBrevoClient();

  const payload = {
    sender:      { email: from, name: 'LaunchPard' },
    to:          recipients,
    replyTo:     { email: replyTo },
    subject,
    htmlContent: body,
  };

  try {
    const result = await client.sendTransacEmail(payload);
    const msgId  = result?.messageId ?? result?.body?.messageId ?? 'sent';
    console.log(`✅ Email sent → ${recipients.map(r => r.email).join(', ')} | msgId: ${msgId}`);
    return result?.body ?? result ?? { sent: true };
  } catch (error) {
    const detail = error?.response?.body ?? error?.message ?? error;
    console.error('❌ Brevo error:', JSON.stringify(detail, null, 2));
    throw error;
  }
}

// ── Named helpers (used in route handlers) ────────────────────────────────────

export async function sendWelcomeEmail({ parentEmail, parentName }) {
  const { EMAIL_TEMPLATES } = await import('./emailTemplates.js');
  const t = EMAIL_TEMPLATES.welcome(parentName);
  return sendEmail({ to: parentEmail, subject: t.subject, htmlContent: t.htmlContent });
}

export async function sendScholarCreatedEmail({ parentEmail, parentName, scholarName, questCode, curriculum, yearLevel }) {
  const { EMAIL_TEMPLATES } = await import('./emailTemplates.js');
  const t = EMAIL_TEMPLATES.scholarCreated(parentName, scholarName, questCode, curriculum, yearLevel);
  return sendEmail({ to: parentEmail, subject: t.subject, htmlContent: t.htmlContent });
}

export async function sendFirstQuizEmail({ parentEmail, parentName, scholarName, score, total, subject, xpEarned }) {
  const { EMAIL_TEMPLATES } = await import('./emailTemplates.js');
  const t = EMAIL_TEMPLATES.firstQuiz(parentName, scholarName, subject, score, total, xpEarned);
  return sendEmail({ to: parentEmail, subject: t.subject, htmlContent: t.htmlContent });
}

export async function sendWeeklyDigestEmail({ parentEmail, parentName, scholars }) {
  const { EMAIL_TEMPLATES } = await import('./emailTemplates.js');
  const t = EMAIL_TEMPLATES.weeklyDigest(parentName, scholars);
  return sendEmail({ to: parentEmail, subject: t.subject, htmlContent: t.htmlContent });
}

export async function sendStreakMilestoneEmail({ parentEmail, parentName, scholarName, streakDays }) {
  const { EMAIL_TEMPLATES } = await import('./emailTemplates.js');
  const t = EMAIL_TEMPLATES.streakMilestone(parentName, scholarName, streakDays);
  return sendEmail({ to: parentEmail, subject: t.subject, htmlContent: t.htmlContent });
}

export async function sendPasswordResetEmail({ parentEmail, parentName, resetUrl }) {
  const { EMAIL_TEMPLATES } = await import('./emailTemplates.js');
  const t = EMAIL_TEMPLATES.passwordReset(parentName, resetUrl);
  return sendEmail({ to: parentEmail, subject: t.subject, htmlContent: t.htmlContent });
}

// ── helpers ───────────────────────────────────────────────────────────────────
function normaliseRecipients(to) {
  if (!to) return [];
  if (Array.isArray(to)) {
    return to.map(r => {
      if (typeof r === 'string') return { email: r };
      if (r?.email)              return { email: r.email, ...(r.name ? { name: r.name } : {}) };
      return null;
    }).filter(Boolean);
  }
  if (typeof to === 'object' && to.email) {
    return [{ email: to.email, ...(to.name ? { name: to.name } : {}) }];
  }
  if (typeof to === 'string') return [{ email: to }];
  return [];
}