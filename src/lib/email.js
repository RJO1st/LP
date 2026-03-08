/**
 * lib/email.js
 * Deploy to: src/lib/email.js
 *
 * Unified Brevo transactional email sender.
 *
 * THE BUG THAT WAS BREAKING EMAILS:
 *   The old uploads/route.js called sendEmail({ html }) but email.js in outputs
 *   mapped the field as htmlContent only. The live uploads/route.js also had NO
 *   import of EMAIL_TEMPLATES — it was using raw inline HTML.
 *
 *   This version accepts both `html` and `htmlContent` so all callers work.
 *
 * BREVO SMTP vs API NOTE:
 *   You configured Brevo SMTP in Supabase (for auth emails).
 *   For transactional emails FROM Next.js, we use Brevo's HTTP API (not SMTP),
 *   which requires BREVO_API_KEY in your Vercel env vars.
 *   These are separate — SMTP for Supabase, API key for Next.js routes.
 */

import * as brevo from '@getbrevo/brevo';

let _apiInstance = null;
function getApi() {
  if (_apiInstance) return _apiInstance;
  if (!process.env.BREVO_API_KEY) {
    throw new Error('BREVO_API_KEY is not set. Add it to your Vercel/local .env.local file.');
  }
  const api = new brevo.TransactionalEmailsApi();
  api.setApiKey(brevo.TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY);
  _apiInstance = api;
  return api;
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
  from    = 'hello@launchpard.com',
  replyTo = 'support@launchpard.com',
}) {
  const recipients = normaliseRecipients(to);
  if (!recipients.length) throw new Error('sendEmail: no valid recipients');

  const body = htmlContent ?? html;
  if (!body) throw new Error('sendEmail: no html/htmlContent supplied');

  const sendSmtpEmail              = new brevo.SendSmtpEmail();
  sendSmtpEmail.to                 = recipients;
  sendSmtpEmail.sender             = { email: from, name: 'LaunchPard' };
  sendSmtpEmail.replyTo            = { email: replyTo };
  sendSmtpEmail.subject            = subject;
  sendSmtpEmail.htmlContent        = body;

  try {
    const result = await getApi().sendTransacEmail(sendSmtpEmail);
    console.log(`✅ Email sent → ${recipients.map(r => r.email).join(', ')} | msgId: ${result?.body?.messageId}`);
    return result?.body ?? { sent: true };
  } catch (error) {
    const detail = error?.response?.body ?? error?.message ?? error;
    console.error('❌ Brevo error:', JSON.stringify(detail, null, 2));
    throw error;
  }
}

// ── Named helpers (used in route handlers) ────────────────────────────────────

export async function sendWelcomeEmail({ parentEmail, parentName }) {
  const { EMAIL_TEMPLATES } = await import('./emailTemplates');
  const t = EMAIL_TEMPLATES.welcome(parentName);
  return sendEmail({ to: parentEmail, subject: t.subject, htmlContent: t.htmlContent });
}

export async function sendScholarCreatedEmail({ parentEmail, parentName, scholarName, questCode, curriculum, yearLevel }) {
  const { EMAIL_TEMPLATES } = await import('./emailTemplates');
  const t = EMAIL_TEMPLATES.scholarCreated(parentName, scholarName, questCode, curriculum, yearLevel);
  return sendEmail({ to: parentEmail, subject: t.subject, htmlContent: t.htmlContent });
}

export async function sendFirstQuizEmail({ parentEmail, parentName, scholarName, score, total, subject, xpEarned }) {
  const { EMAIL_TEMPLATES } = await import('./emailTemplates');
  const t = EMAIL_TEMPLATES.firstQuiz(parentName, scholarName, subject, score, total, xpEarned);
  return sendEmail({ to: parentEmail, subject: t.subject, htmlContent: t.htmlContent });
}

export async function sendWeeklyDigestEmail({ parentEmail, parentName, scholars }) {
  const { EMAIL_TEMPLATES } = await import('./emailTemplates');
  const t = EMAIL_TEMPLATES.weeklyDigest(parentName, scholars);
  return sendEmail({ to: parentEmail, subject: t.subject, htmlContent: t.htmlContent });
}

export async function sendStreakMilestoneEmail({ parentEmail, parentName, scholarName, streakDays }) {
  const { EMAIL_TEMPLATES } = await import('./emailTemplates');
  const t = EMAIL_TEMPLATES.streakMilestone(parentName, scholarName, streakDays);
  return sendEmail({ to: parentEmail, subject: t.subject, htmlContent: t.htmlContent });
}

export async function sendPasswordResetEmail({ parentEmail, parentName, resetUrl }) {
  const { EMAIL_TEMPLATES } = await import('./emailTemplates');
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
