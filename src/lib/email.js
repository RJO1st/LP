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

/**
 * sendEmail({ to, subject, html, htmlContent, from, replyTo })
 */
export async function sendEmail({
  to,
  subject,
  html,
  htmlContent,
  from    = BREVO_SENDER.email,
  replyTo = BREVO_REPLY,
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