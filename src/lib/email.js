/**
 * lib/email.js
 * Deploy to: src/lib/email.js
 *
 * Unified Brevo transactional email sender.
 * Uses Brevo HTTP API directly via fetch — no SDK import issues.
 * Works with any @getbrevo/brevo version.
 */

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';
const BREVO_SENDER  = { email: 'hello@launchpard.com', name: 'LaunchPard' };
const BREVO_REPLY   = 'support@launchpard.com';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://launchpard.com';

/**
 * Standard List-Unsubscribe headers for bulk/digest emails.
 *
 * Gmail's bulk-sender rules (enforced April 2024) require:
 *   - `List-Unsubscribe` with an https: one-click URL *and* a mailto: fallback
 *   - `List-Unsubscribe-Post: List-Unsubscribe=One-Click` (RFC 8058)
 *
 * Pass these as `headers` in any sendEmail call for digest / newsletter sends.
 * Do NOT add to OTP / password-reset / safeguarding emails (they are
 * transactional and must always reach the recipient).
 */
export const BULK_UNSUBSCRIBE_HEADERS = {
  'List-Unsubscribe':
    `<${APP_URL}/dashboard/parent?tab=settings&unsubscribe=digest>, ` +
    `<mailto:unsubscribe@launchpard.com?subject=unsubscribe>`,
  'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
};

/**
 * sendEmail({ to, subject, html, htmlContent, from, replyTo, headers })
 *
 * @param {object}  options
 * @param {string|string[]|{email:string,name?:string}[]} options.to
 * @param {string}  options.subject
 * @param {string}  [options.html]         — alias for htmlContent
 * @param {string}  [options.htmlContent]  — preferred; wins over html
 * @param {string}  [options.from]         — defaults to hello@launchpard.com
 * @param {string}  [options.replyTo]      — defaults to support@launchpard.com
 * @param {object}  [options.headers]      — custom email headers (e.g. List-Unsubscribe)
 */
export async function sendEmail({
  to,
  subject,
  html,
  htmlContent,
  from    = BREVO_SENDER.email,
  replyTo = BREVO_REPLY,
  headers = {},
}) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) throw new Error('BREVO_API_KEY is not set in Vercel env vars.');

  const recipients = normaliseRecipients(to);
  if (!recipients.length) throw new Error('sendEmail: no valid recipients');

  const body = htmlContent ?? html;
  if (!body) throw new Error('sendEmail: no html/htmlContent supplied');

  const payload = {
    sender:      { email: from, name: 'LaunchPard' },
    to:          recipients,
    replyTo:     { email: replyTo },
    subject,
    htmlContent: body,
    // Brevo SMTP API accepts arbitrary custom headers under the `headers` key.
    // Only include the key if the caller actually supplied headers.
    ...(Object.keys(headers).length > 0 ? { headers } : {}),
  };

  const res = await fetch(BREVO_API_URL, {
    method:  'POST',
    headers: {
      'Accept':       'application/json',
      'Content-Type': 'application/json',
      'api-key':      apiKey,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errBody = await res.text();
    console.error('❌ Brevo error:', res.status, errBody);
    throw new Error(`Brevo API error ${res.status}: ${errBody}`);
  }

  const result = await res.json();
  console.log(`✅ Email sent → ${recipients.map(r => r.email).join(', ')} | msgId: ${result?.messageId ?? 'sent'}`);
  return result;
}

// ── Named helpers ─────────────────────────────────────────────────────────────

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

export async function sendSchoolReminderEmail({ parentEmail, parentName, scholarNames }) {
  const { EMAIL_TEMPLATES } = await import('./emailTemplates.js');
  const t = EMAIL_TEMPLATES.schoolReminder(parentName, scholarNames);
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