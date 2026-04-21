// lib/emailTemplates.js
// Deploy to: src/lib/emailTemplates.js
//
// All LaunchPard transactional email templates.
// Returns { subject, htmlContent } — pass directly to sendEmail().

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://launchpard.com';

// ── Shared styles ─────────────────────────────────────────────────────────────
const css = `
  body { margin:0; padding:0; font-family: 'Helvetica Neue', Arial, sans-serif; background:#f1f5f9; }
  .wrap { max-width:560px; margin:0 auto; background:#ffffff; border-radius:20px; overflow:hidden; }
  .header { background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%); padding:40px 32px 32px; text-align:center; }
  .header h1 { margin:0 0 4px; color:#ffffff; font-size:26px; font-weight:900; letter-spacing:-0.5px; }
  .header p  { margin:0; color:#c7d2fe; font-size:14px; font-weight:600; }
  .body { padding:32px; }
  .body p { color:#374151; font-size:15px; line-height:1.7; margin:0 0 16px; }
  .stat-row { display:flex; gap:12px; margin:20px 0; }
  .stat { flex:1; background:#f8fafc; border:2px solid #e2e8f0; border-radius:14px; padding:16px; text-align:center; }
  .stat .num { font-size:28px; font-weight:900; color:#4f46e5; }
  .stat .label { font-size:11px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:.08em; margin-top:2px; }
  .cta { display:block; background:#4f46e5; color:#ffffff !important; text-decoration:none;
         font-weight:900; font-size:15px; text-align:center; padding:16px 24px;
         border-radius:14px; margin:24px 0; }
  .code { background:#f1f5f9; border:2px solid #e2e8f0; border-radius:10px; padding:14px 20px;
          font-family:monospace; font-size:22px; font-weight:900; letter-spacing:4px;
          color:#1e293b; text-align:center; margin:20px 0; }
  .tip  { background:#eff6ff; border-left:4px solid #4f46e5; border-radius:0 10px 10px 0;
          padding:14px 16px; margin:20px 0; }
  .tip p { margin:0; font-size:13px; color:#1e40af; font-weight:600; }
  .footer { background:#f8fafc; padding:24px 32px; text-align:center; }
  .footer p { margin:0; font-size:12px; color:#94a3b8; }
  .footer a { color:#6366f1; text-decoration:none; font-weight:700; }
`;

function shell(headerTitle, headerSub, bodyHtml) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${headerTitle}</title>
<style>${css}</style>
</head>
<body>
<div style="padding:24px 16px;">
<div class="wrap">
  <div class="header">
    <h1>🚀 ${headerTitle}</h1>
    <p>${headerSub}</p>
  </div>
  <div class="body">
    ${bodyHtml}
  </div>
  <div class="footer">
    <p>LaunchPard · AI-powered learning for every scholar<br>
    <a href="${BASE_URL}">launchpard.com</a> ·
    <a href="mailto:support@launchpard.com">support@launchpard.com</a></p>
  </div>
</div>
</div>
</body>
</html>`;
}

// ── Curriculum display name helper ────────────────────────────────────────────
function curriculumLabel(curriculum) {
  const map = {
    uk_11plus:        'UK 11+ (GL / CEM)',
    uk_national:      'UK National Curriculum',
    uk_ks1:           'UK KS1',
    uk_ks2:           'UK KS2',
    uk_ks3:           'UK KS3',
    uk_ks4:           'UK KS4 / GCSE',
    us_common_core:   'US Common Core',
    australian:       'Australian National Curriculum',
    ib_pyp:           'IB Primary Years (PYP)',
    ib_myp:           'IB Middle Years (MYP)',
    ng_primary:       'Nigerian Primary (NERDC / UBEC)',
    ng_jss:           'Nigerian JSS (NERDC / WAEC)',
    ng_sss:           'Nigerian SSS (WAEC / NECO)',
    ng_british:       'Nigerian School · British Curriculum',
    ng_hybrid:        'Nigerian School · Hybrid Curriculum',
    nigerian_primary: 'Nigerian Primary (NERDC)',
    nigerian_jss:     'Nigerian JSS (BECE)',
    waec:             'WAEC / NECO (SSS)',
  };
  return map[curriculum] ?? curriculum ?? 'Standard';
}

// ─────────────────────────────────────────────────────────────────────────────
export const EMAIL_TEMPLATES = {

  // ── Welcome email (sent on sign-up) ────────────────────────────────────────
  welcome(parentName) {
    const body = `
      <p>Hi ${parentName ?? 'there'},</p>
      <p>Welcome to <strong>LaunchPard</strong> — your scholars' mission control for smarter learning. 🎉</p>
      <p>Your <strong>30-day free trial</strong> has started. Here's what to do next:</p>
      <ol style="color:#374151;font-size:15px;line-height:2;">
        <li>Add up to <strong>3 scholars</strong> from your guardian dashboard</li>
        <li>Choose their curriculum &amp; year group</li>
        <li>Watch them blast off! 🚀</li>
      </ol>
      <a href="${BASE_URL}/dashboard/parent" class="cta">Go to Mission Control →</a>
      <div class="tip"><p>💡 Tip: Each scholar gets a unique Quest Code they can use to log in on any device.</p></div>
      <p style="font-size:13px;color:#94a3b8;">Questions? Reply to this email or visit our help centre.</p>
    `;
    return {
      subject: '🚀 Welcome to LaunchPard – your free trial is live!',
      htmlContent: shell('Welcome aboard!', 'Your learning mission starts now', body),
    };
  },

  // ── Scholar created (sent when parent adds a new scholar) ──────────────────
  scholarCreated(parentName, scholarName, questCode, curriculum, yearLevel) {
    const body = `
      <p>Hi ${parentName ?? 'there'},</p>
      <p>You've successfully added <strong>${scholarName}</strong> as a LaunchPard scholar. They're ready to launch! 🛸</p>

      <div class="stat-row">
        <div class="stat">
          <div class="num">${yearLevel ?? '—'}</div>
          <div class="label">Year Group</div>
        </div>
        <div class="stat">
          <div class="num" style="font-size:14px;padding-top:6px;">${curriculumLabel(curriculum)}</div>
          <div class="label">Curriculum</div>
        </div>
      </div>

      <p><strong>${scholarName}'s Quest Code:</strong></p>
      <div class="code">${questCode ?? '——'}</div>

      <div class="tip">
        <p>📋 Share this code with ${scholarName} — they'll use it to log in and start quests on any device.</p>
      </div>

      <h3 style="color:#1e293b;font-size:16px;font-weight:900;margin:28px 0 16px;">📘 Getting Started Guide</h3>

      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
        <tr>
          <td style="padding:12px 16px;background:#eef2ff;border-radius:12px;vertical-align:top;">
            <div style="display:inline-block;width:24px;height:24px;border-radius:50%;background:#4f46e5;color:#fff;text-align:center;line-height:24px;font-size:12px;font-weight:900;">1</div>
            <strong style="color:#1e293b;font-size:13px;margin-left:8px;">Share the quest code above</strong>
            <p style="color:#64748b;font-size:12px;margin:6px 0 0 32px;">Give ${scholarName} their codename and PIN shown above. They'll need this to sign in.</p>
          </td>
        </tr>
        <tr><td style="height:8px;"></td></tr>
        <tr>
          <td style="padding:12px 16px;background:#f5f3ff;border-radius:12px;vertical-align:top;">
            <div style="display:inline-block;width:24px;height:24px;border-radius:50%;background:#7c3aed;color:#fff;text-align:center;line-height:24px;font-size:12px;font-weight:900;">2</div>
            <strong style="color:#1e293b;font-size:13px;margin-left:8px;">Sign them in</strong>
            <p style="color:#64748b;font-size:12px;margin:6px 0 0 32px;">Go to <a href="${BASE_URL}/login" style="color:#4f46e5;font-weight:700;">launchpard.com</a> → tap <strong>Scholar</strong> → enter their codename and PIN. Works on phone, tablet, or laptop.</p>
          </td>
        </tr>
        <tr><td style="height:8px;"></td></tr>
        <tr>
          <td style="padding:12px 16px;background:#ecfdf5;border-radius:12px;vertical-align:top;">
            <div style="display:inline-block;width:24px;height:24px;border-radius:50%;background:#059669;color:#fff;text-align:center;line-height:24px;font-size:12px;font-weight:900;">3</div>
            <strong style="color:#1e293b;font-size:13px;margin-left:8px;">Start their first quest</strong>
            <p style="color:#64748b;font-size:12px;margin:6px 0 0 32px;">They'll see a personalised dashboard. Tap <strong>Start Adventure</strong> to begin. Tara the AI tutor guides them through every question.</p>
          </td>
        </tr>
      </table>

      <div class="tip">
        <p>💡 <strong>Tip:</strong> 10-15 minutes of daily practice builds lasting knowledge. Check your guardian dashboard anytime for progress reports.</p>
      </div>

      <a href="${BASE_URL}/dashboard/parent" class="cta">View ${scholarName}'s Dashboard →</a>
      <p style="font-size:13px;color:#94a3b8;">Keep this code safe. Guardians can always find it in Mission Control.</p>
    `;
    return {
      subject: `🛸 ${scholarName} is ready to launch on LaunchPard!`,
      htmlContent: shell(`${scholarName} has joined the mission!`, 'Scholar profile created', body),
    };
  },

  // ── First quiz completed (sent after scholar finishes their first quiz) ─────
  firstQuiz(parentName, scholarName, subject, score, totalQuestions, xpEarned) {
    const pct     = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;
    const emoji   = pct >= 80 ? '🌟' : pct >= 60 ? '⭐' : '💫';
    const message = pct >= 80
      ? `Outstanding! ${scholarName} is off to a brilliant start.`
      : pct >= 60
      ? `Great effort! ${scholarName} is making solid progress.`
      : `${scholarName} has taken their first step — every mission starts somewhere!`;

    const body = `
      <p>Hi ${parentName ?? 'there'},</p>
      <p>${emoji} <strong>${scholarName}</strong> just completed their first LaunchPard quiz in <strong>${subject ?? 'their chosen subject'}</strong>!</p>
      <p>${message}</p>

      <div class="stat-row">
        <div class="stat">
          <div class="num">${score}/${totalQuestions}</div>
          <div class="label">Score</div>
        </div>
        <div class="stat">
          <div class="num">${pct}%</div>
          <div class="label">Accuracy</div>
        </div>
        <div class="stat">
          <div class="num">+${xpEarned ?? score * 10}</div>
          <div class="label">✨ Stardust</div>
        </div>
      </div>

      <a href="${BASE_URL}/dashboard/parent" class="cta">See ${scholarName}'s Full Progress →</a>

      <div class="tip">
        <p>💡 Regular practice of just 15 minutes a day builds lasting knowledge. Encourage ${scholarName} to complete a quest each evening!</p>
      </div>
    `;
    return {
      subject: `${emoji} ${scholarName} completed their first LaunchPard quiz!`,
      htmlContent: shell('First Quest Complete!', `${scholarName} is on the launchpad`, body),
    };
  },

  // ── Weekly digest (sent every Sunday to active parents) ────────────────────
  weeklyDigest(parentName, scholars) {
    // scholars: [{ name, subject, quizCount, accuracy, xpEarned, streak }]
    const rows = (scholars ?? []).map(s => `
      <tr>
        <td style="padding:10px 12px;font-weight:700;color:#1e293b;">${s.name}</td>
        <td style="padding:10px 12px;color:#475569;">${s.quizCount ?? 0} quests</td>
        <td style="padding:10px 12px;color:#475569;">${s.accuracy ?? 0}%</td>
        <td style="padding:10px 12px;color:#4f46e5;font-weight:900;">+${s.xpEarned ?? 0} ✨</td>
        <td style="padding:10px 12px;color:#f59e0b;font-weight:700;">${s.streak ?? 0} 🔥</td>
      </tr>
    `).join('');

    const body = `
      <p>Hi ${parentName ?? 'there'},</p>
      <p>Here's your weekly mission report for the scholars in your command! 🛸</p>

      <table style="width:100%;border-collapse:collapse;font-size:13px;margin:20px 0;">
        <thead>
          <tr style="background:#f1f5f9;">
            <th style="padding:8px 12px;text-align:left;color:#94a3b8;font-weight:700;text-transform:uppercase;font-size:10px;letter-spacing:.08em;">Scholar</th>
            <th style="padding:8px 12px;text-align:left;color:#94a3b8;font-weight:700;text-transform:uppercase;font-size:10px;letter-spacing:.08em;">Quests</th>
            <th style="padding:8px 12px;text-align:left;color:#94a3b8;font-weight:700;text-transform:uppercase;font-size:10px;letter-spacing:.08em;">Accuracy</th>
            <th style="padding:8px 12px;text-align:left;color:#94a3b8;font-weight:700;text-transform:uppercase;font-size:10px;letter-spacing:.08em;">Stardust</th>
            <th style="padding:8px 12px;text-align:left;color:#94a3b8;font-weight:700;text-transform:uppercase;font-size:10px;letter-spacing:.08em;">Streak</th>
          </tr>
        </thead>
        <tbody>${rows || '<tr><td colspan="5" style="padding:16px;text-align:center;color:#94a3b8;">No activity this week</td></tr>'}</tbody>
      </table>

      <a href="${BASE_URL}/dashboard/parent" class="cta">View Full Report in Mission Control →</a>
      <div class="tip"><p>💡 Scholars who complete at least 3 quests a week improve accuracy by an average of 12% per month.</p></div>
    `;
    return {
      subject: '📊 Your weekly LaunchPard mission report',
      htmlContent: shell('Weekly Mission Report', 'Here\'s how your scholars performed', body),
    };
  },

  // ── School reminder (sent when scholar is missing school_id) ────────────────
  schoolReminder(parentName, scholarNames = []) {
    const list = scholarNames.length === 1
      ? `<strong>${scholarNames[0]}</strong>`
      : scholarNames.map(n => `<strong>${n}</strong>`).join(', ');
    const plural = scholarNames.length > 1;
    const body = `
      <p>Hi ${parentName ?? 'there'},</p>
      <p>Quick heads-up — ${plural ? 'some of your scholars don\'t' : `${list} doesn't`} have a school assigned yet on LaunchPard.</p>
      <p>Adding a school helps us personalise their learning experience even further. It only takes a moment:</p>
      <ol style="color:#374151;font-size:15px;line-height:2;">
        <li>Open your <strong>Guardian Dashboard</strong></li>
        <li>Find the <strong>"Add School"</strong> button on ${plural ? 'their cards' : 'their card'}</li>
        <li>Search for the school or add it manually</li>
      </ol>
      <a href="${BASE_URL}/dashboard/parent" class="cta">Go to Dashboard →</a>
      <div class="tip"><p>🏫 ${plural ? `Scholars needing a school: ${list}` : `Scholar: ${list}`}</p></div>
      <p style="font-size:13px;color:#94a3b8;">No rush — but the sooner you add it, the better we can tailor their quests!</p>
    `;
    return {
      subject: '🏫 Quick reminder: add a school for your scholar',
      htmlContent: shell('School Info Needed', 'Help us personalise learning', body),
    };
  },

  // ── Inactivity nudge (sent when scholar hasn't practised recently) ─────────
  inactivityNudge(parentName, scholars) {
    // scholars: [{ name, daysSince, lastSubject, streak, accessCode }]
    const scholarBlocks = (scholars ?? []).map(s => {
      const dayLabel = s.daysSince === 1 ? '1 day' : `${s.daysSince} days`;
      const streakMsg = s.streak > 0
        ? `<span style="color:#f59e0b;font-weight:800;">${s.streak}-day streak at risk!</span>`
        : '';
      return `
        <div style="background:#fff7ed;border-radius:14px;padding:16px;margin-bottom:12px;border:2px solid #fed7aa;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
            <span style="font-weight:800;font-size:16px;color:#1e293b;">🧑‍🚀 ${s.name}</span>
            <span style="background:#fef3c7;color:#92400e;padding:4px 10px;border-radius:8px;font-size:12px;font-weight:700;">
              ${dayLabel} since last quest
            </span>
          </div>
          ${s.lastSubject ? `<p style="font-size:13px;color:#64748b;margin:0 0 6px;">Last practised: <strong>${s.lastSubject}</strong></p>` : ''}
          ${streakMsg ? `<p style="font-size:13px;margin:0 0 6px;">${streakMsg}</p>` : ''}
          ${s.accessCode ? `
            <div style="background:#f8fafc;border-radius:10px;padding:10px;text-align:center;margin-top:8px;">
              <span style="font-size:10px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Quest Code</span>
              <div style="font-size:20px;font-weight:900;color:#4f46e5;letter-spacing:3px;margin-top:2px;">${s.accessCode}</div>
            </div>
          ` : ''}
        </div>
      `;
    }).join('');

    const names = (scholars ?? []).map(s => s.name);
    const nameStr = names.length === 1 ? names[0] : names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1];

    const body = `
      <p>Hi ${parentName ?? 'there'},</p>
      <p>We noticed <strong>${nameStr}</strong> ${names.length > 1 ? "haven't" : "hasn't"} completed any quests recently.</p>
      <p>It's midterm break — the perfect time for a quick practice session! Just <strong>10-15 minutes a day</strong> keeps skills sharp and builds lasting confidence.</p>

      ${scholarBlocks}

      <div class="tip">
        <p>💡 <strong>Did you know?</strong> Scholars who practise during school breaks return 23% more confident and retain more of what they learned last term.</p>
      </div>

      <a href="${BASE_URL}/login" class="cta">Launch a Quick Quest →</a>

      <p style="font-size:13px;color:#64748b;margin-top:20px;">
        Even one session makes a difference. Why not set a fun challenge — 3 quests this week earns a coin bonus!
      </p>
      <p style="font-size:12px;color:#94a3b8;">You're receiving this because ${names.length > 1 ? 'your scholars are' : `${names[0]} is`} registered on LaunchPard. <a href="${BASE_URL}/dashboard/parent" style="color:#6366f1;">Manage preferences</a></p>
    `;
    return {
      subject: `🔔 ${nameStr} ${names.length > 1 ? "haven't" : "hasn't"} practised recently — midterm is the perfect time!`,
      htmlContent: shell('Time for a Quick Quest!', 'Keep the momentum going over break', body),
    };
  },

  // ── Password reset (if using custom auth flow) ─────────────────────────────
  passwordReset(parentName, resetUrl) {
    const body = `
      <p>Hi ${parentName ?? 'there'},</p>
      <p>We received a request to reset your LaunchPard password. Click the button below to set a new one.</p>
      <a href="${resetUrl}" class="cta">Reset My Password →</a>
      <div class="tip"><p>⏰ This link expires in 1 hour. If you didn't request a reset, you can safely ignore this email.</p></div>
    `;
    return {
      subject: '🔑 Reset your LaunchPard password',
      htmlContent: shell('Password Reset', 'Secure your account', body),
    };
  },

  // ── Scholar invitation (sent to parents when school imports scholars via CSV) ─
  scholarInvitation(schoolName, studentName, validationCode, claimUrl) {
    const body = `
      <p>Hello!</p>
      <p><strong>${studentName}</strong> has been enrolled at <strong>${schoolName}</strong> on LaunchPard — the AI-powered learning platform used by their school.</p>
      <p>To activate their account and track their progress, claim their scholar profile using the code below:</p>

      <div class="code">${validationCode}</div>

      <a href="${claimUrl}" class="cta">Claim ${studentName}'s Profile →</a>

      <div class="tip">
        <p>⏰ This invitation expires in 7 days. Once you claim the profile, you'll see ${studentName}'s learning progress, quiz scores, and AI tutor feedback in real time.</p>
      </div>

      <h3 style="color:#1e293b;font-size:16px;font-weight:900;margin:28px 0 12px;">What happens next?</h3>

      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
        <tr>
          <td style="padding:12px 16px;background:#eef2ff;border-radius:12px;vertical-align:top;">
            <div style="display:inline-block;width:24px;height:24px;border-radius:50%;background:#4f46e5;color:#fff;text-align:center;line-height:24px;font-size:12px;font-weight:900;">1</div>
            <strong style="color:#1e293b;font-size:13px;margin-left:8px;">Click the button above</strong>
            <p style="color:#64748b;font-size:12px;margin:6px 0 0 32px;">Create a free LaunchPard account in 30 seconds.</p>
          </td>
        </tr>
        <tr><td style="height:8px;"></td></tr>
        <tr>
          <td style="padding:12px 16px;background:#f5f3ff;border-radius:12px;vertical-align:top;">
            <div style="display:inline-block;width:24px;height:24px;border-radius:50%;background:#7c3aed;color:#fff;text-align:center;line-height:24px;font-size:12px;font-weight:900;">2</div>
            <strong style="color:#1e293b;font-size:13px;margin-left:8px;">Claim ${studentName}'s profile</strong>
            <p style="color:#64748b;font-size:12px;margin:6px 0 0 32px;">Enter the code above — this links your account to their school record.</p>
          </td>
        </tr>
        <tr><td style="height:8px;"></td></tr>
        <tr>
          <td style="padding:12px 16px;background:#ecfdf5;border-radius:12px;vertical-align:top;">
            <div style="display:inline-block;width:24px;height:24px;border-radius:50%;background:#059669;color:#fff;text-align:center;line-height:24px;font-size:12px;font-weight:900;">3</div>
            <strong style="color:#1e293b;font-size:13px;margin-left:8px;">Track progress, anytime</strong>
            <p style="color:#64748b;font-size:12px;margin:6px 0 0 32px;">Get a live view of ${studentName}'s quests, scores, and areas to improve from your guardian dashboard.</p>
          </td>
        </tr>
      </table>

      <p style="font-size:13px;color:#94a3b8;">This email was sent by ${schoolName} via LaunchPard. If you weren't expecting this, you can safely ignore it.</p>
    `;
    return {
      subject: `📚 ${studentName} has been enrolled on LaunchPard by ${schoolName}`,
      htmlContent: shell(`${studentName} is ready to learn!`, `Enrolled by ${schoolName}`, body),
    };
  },

  // ── School provisioned (sent to proprietor when admin sets up a school) ─────
  schoolProvisioned(schoolName, setupUrl, isNewUser) {
    const body = `
      <p>Hi there,</p>
      <p>A LaunchPard school dashboard has been created for <strong>${schoolName}</strong>. 🏫</p>
      <p>${isNewUser
        ? "Click the button below to set your password and complete the 10-minute school setup."
        : "Click the button below to log in and complete your school setup."
      }</p>

      <a href="${setupUrl}" class="cta">${isNewUser ? "Accept Invitation &amp; Set Up School →" : "Log In &amp; Set Up School →"}</a>

      <div class="tip">
        <p>⏰ This link expires in 7 days. If you didn't expect this email, you can safely ignore it.</p>
      </div>

      <div class="stat-row">
        <div class="stat">
          <div class="num" style="font-size:18px;">~10 min</div>
          <div class="label">Setup time</div>
        </div>
        <div class="stat">
          <div class="num" style="font-size:18px;">Free</div>
          <div class="label">To get started</div>
        </div>
        <div class="stat">
          <div class="num" style="font-size:18px;">100%</div>
          <div class="label">Cohort visibility</div>
        </div>
      </div>

      <p style="font-size:13px;color:#94a3b8;">Questions? Reply to this email or contact <a href="mailto:hello@launchpard.com" style="color:#4f46e5;">hello@launchpard.com</a></p>
    `;
    return {
      subject: isNewUser
        ? `You've been invited to set up ${schoolName} on LaunchPard`
        : `Your LaunchPard school setup link — ${schoolName}`,
      htmlContent: shell('Your school dashboard is ready.', `LaunchPard Schools · ${schoolName}`, body),
    };
  },
};