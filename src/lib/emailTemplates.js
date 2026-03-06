// ═══════════════════════════════════════════════════════════════════════════
// BREVO EMAIL AUTOMATION - Complete Implementation
// ═══════════════════════════════════════════════════════════════════════════
// File: src/lib/emailTemplates.js
// All email templates for LaunchPard
// ═══════════════════════════════════════════════════════════════════════════

export const EMAIL_TEMPLATES = {
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 1. WELCOME EMAIL (Immediate after signup)
  // ═══════════════════════════════════════════════════════════════════════════
  welcome: (parentName, trialEndDate) => ({
    subject: '🚀 Welcome to LaunchPard - Your 7-Day Free Trial Starts Now!',
    htmlContent: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1e293b; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 40px 20px; text-align: center; border-radius: 12px; }
          .header h1 { color: white; margin: 0; font-size: 28px; }
          .content { background: white; padding: 30px; border-radius: 12px; margin-top: 20px; }
          .button { display: inline-block; background: #6366f1; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 10px 0; }
          .checklist { background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .checklist-item { margin: 12px 0; padding-left: 30px; position: relative; }
          .checklist-item:before { content: '✅'; position: absolute; left: 0; }
          .stats { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin: 20px 0; }
          .stat-box { background: #f1f5f9; padding: 15px; border-radius: 8px; text-align: center; }
          .stat-number { font-size: 24px; font-weight: bold; color: #6366f1; }
          .footer { text-align: center; color: #64748b; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🚀 Welcome to LaunchPard!</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Your 7-Day Free Trial Starts Now</p>
          </div>
          
          <div class="content">
            <p>Hi ${parentName},</p>
            
            <p>Welcome to LaunchPard! 🎉 Your free trial is now active and ready to transform your child's learning journey.</p>
            
            <div class="checklist">
              <h3 style="margin-top: 0;">Quick Start Guide:</h3>
              <div class="checklist-item">
                <strong>Create Your First Scholar</strong><br>
                Go to your dashboard and add your child
              </div>
              <div class="checklist-item">
                <strong>Choose Their Curriculum</strong><br>
                We support 10 international curricula including WAEC Nigeria
              </div>
              <div class="checklist-item">
                <strong>Get Their QUEST Code</strong><br>
                Share this unique code with your child to login
              </div>
              <div class="checklist-item">
                <strong>Watch Them Learn</strong><br>
                Track progress in real-time with detailed analytics
              </div>
            </div>
            
            <div class="stats">
              <div class="stat-box">
                <div class="stat-number">10,000+</div>
                <div>Questions</div>
              </div>
              <div class="stat-box">
                <div class="stat-number">10</div>
                <div>Curricula</div>
              </div>
              <div class="stat-box">
                <div class="stat-number">100%</div>
                <div>Gamified</div>
              </div>
              <div class="stat-box">
                <div class="stat-number">24/7</div>
                <div>Access</div>
              </div>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://launchpard.com/dashboard/parent" class="button">Go to Dashboard →</a>
            </div>
            
            <p><strong>What's Included:</strong></p>
            <ul>
              <li>✨ Unlimited quiz access across all subjects</li>
              <li>📊 Real-time progress analytics</li>
              <li>🏆 Gamification with badges, streaks & XP</li>
              <li>🎯 Curriculum-aligned content (WAEC, 11+, IB, etc.)</li>
              <li>⚛️ Physics, Chemistry, Biology for SSS students</li>
            </ul>
            
            <p style="background: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b;">
              <strong>⏰ Your trial ends: ${trialEndDate}</strong><br>
              No credit card required!
            </p>
            
            <p>Questions? Just reply to this email - we're here to help!</p>
            
            <p>Best,<br>
            <strong>The LaunchPard Team</strong></p>
          </div>
          
          <div class="footer">
            <p>LaunchPard - Making Learning an Adventure</p>
            <p><a href="https://launchpard.com" style="color: #6366f1;">launchpard.com</a></p>
          </div>
        </div>
      </body>
      </html>
    `
  }),

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. FIRST SCHOLAR CREATED (Triggered when scholar is created)
  // ═══════════════════════════════════════════════════════════════════════════
  scholarCreated: (parentName, scholarName, questCode, curriculum, yearLevel) => ({
    subject: `🎓 ${scholarName}'s Learning Journey Begins!`,
    htmlContent: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1e293b; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .hero { background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 20px; text-align: center; border-radius: 12px; color: white; }
          .content { background: white; padding: 30px; border-radius: 12px; margin-top: 20px; }
          .quest-code-box { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 30px; border-radius: 12px; text-align: center; margin: 20px 0; }
          .quest-code { font-size: 32px; font-weight: bold; letter-spacing: 4px; font-family: 'Courier New', monospace; }
          .button { display: inline-block; background: #6366f1; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 10px 0; }
          .tip-box { background: #f0fdf4; border-left: 4px solid #10b981; padding: 15px; border-radius: 8px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="hero">
            <h1>🎓 Scholar Created!</h1>
            <p style="font-size: 20px; margin: 10px 0 0 0;">${scholarName} is ready to start learning</p>
          </div>
          
          <div class="content">
            <p>Hi ${parentName},</p>
            
            <p>Great news! You've successfully created a scholar profile for <strong>${scholarName}</strong>.</p>
            
            <p><strong>📋 Scholar Details:</strong></p>
            <ul>
              <li>Name: ${scholarName}</li>
              <li>Curriculum: ${curriculum}</li>
              <li>Year Level: ${yearLevel}</li>
            </ul>
            
            <div class="quest-code-box">
              <p style="margin: 0 0 10px 0; font-size: 14px; opacity: 0.9;">QUEST ACCESS CODE</p>
              <div class="quest-code">${questCode}</div>
              <p style="margin: 15px 0 0 0; font-size: 14px; opacity: 0.9;">Share this code with ${scholarName} to login</p>
            </div>
            
            <div class="tip-box">
              <p style="margin: 0;"><strong>💡 Next Steps:</strong></p>
              <ol style="margin: 10px 0 0 0; padding-left: 20px;">
                <li>Share the QUEST code above with ${scholarName}</li>
                <li>Help them visit: <strong>launchpard.com/login?type=scholar</strong></li>
                <li>They enter the code and start their first quiz!</li>
              </ol>
            </div>
            
            <p><strong>🎯 What ${scholarName} Gets:</strong></p>
            <ul>
              <li>Personalized dashboard with their subjects</li>
              <li>Curriculum-aligned quizzes</li>
              <li>XP points and badge collection</li>
              <li>Learning streak challenges</li>
              <li>Leaderboard competition with peers</li>
            </ul>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://launchpard.com/dashboard/parent" class="button">View Dashboard →</a>
            </div>
            
            <p>Questions? Reply to this email anytime!</p>
            
            <p>Best,<br>
            <strong>The LaunchPard Team</strong></p>
          </div>
        </div>
      </body>
      </html>
    `
  }),

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. FIRST QUIZ COMPLETED
  // ═══════════════════════════════════════════════════════════════════════════
  firstQuiz: (parentName, scholarName, subject, score, totalQuestions, xpEarned) => ({
    subject: `🎉 ${scholarName} Just Completed Their First Quiz!`,
    htmlContent: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1e293b; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .hero { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 40px 20px; text-align: center; border-radius: 12px; color: white; }
          .content { background: white; padding: 30px; border-radius: 12px; margin-top: 20px; }
          .results-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin: 20px 0; }
          .result-card { background: #f8fafc; padding: 20px; border-radius: 8px; text-align: center; }
          .result-number { font-size: 28px; font-weight: bold; color: #6366f1; }
          .button { display: inline-block; background: #6366f1; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="hero">
            <h1>🎉 First Quiz Complete!</h1>
            <p style="font-size: 18px; margin: 10px 0 0 0;">Achievement Unlocked: "First Steps"</p>
          </div>
          
          <div class="content">
            <p>Hi ${parentName},</p>
            
            <p>Fantastic news! <strong>${scholarName}</strong> just completed their first quiz! 🎊</p>
            
            <div class="results-grid">
              <div class="result-card">
                <div class="result-number">${subject}</div>
                <div style="font-size: 14px; color: #64748b;">Subject</div>
              </div>
              <div class="result-card">
                <div class="result-number">${score}/${totalQuestions}</div>
                <div style="font-size: 14px; color: #64748b;">Score</div>
              </div>
              <div class="result-card">
                <div class="result-number">+${xpEarned} XP</div>
                <div style="font-size: 14px; color: #64748b;">Earned</div>
              </div>
            </div>
            
            <p style="background: #fef3c7; padding: 15px; border-radius: 8px; text-align: center; font-size: 18px;">
              📊 Accuracy: <strong>${Math.round((score / totalQuestions) * 100)}%</strong>
            </p>
            
            <p><strong>🏆 Badge Earned:</strong> "First Steps" - Complete your first quiz</p>
            
            <p>This is just the beginning! Encourage ${scholarName} to:</p>
            <ul>
              <li>Try different subjects to unlock more badges</li>
              <li>Build a daily learning streak</li>
              <li>Compete on the leaderboard</li>
            </ul>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://launchpard.com/dashboard/parent/analytics" class="button">View Full Report →</a>
            </div>
            
            <p>Keep up the great work!</p>
            
            <p>Best,<br>
            <strong>The LaunchPard Team</strong></p>
          </div>
        </div>
      </body>
      </html>
    `
  }),

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. TRIAL ENDING (Day before trial ends)
  // ═══════════════════════════════════════════════════════════════════════════
  trialEnding: (parentName, scholarName, quizzesCompleted, xpEarned, badgesEarned, avgAccuracy) => ({
    subject: '⏰ Your LaunchPard Trial Ends Tomorrow',
    htmlContent: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1e293b; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .hero { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 40px 20px; text-align: center; border-radius: 12px; color: white; }
          .content { background: white; padding: 30px; border-radius: 12px; margin-top: 20px; }
          .stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin: 20px 0; }
          .stat-card { background: #f8fafc; padding: 20px; border-radius: 8px; text-align: center; border: 2px solid #e2e8f0; }
          .stat-number { font-size: 32px; font-weight: bold; color: #6366f1; }
          .warning-box { background: #fef2f2; border: 2px solid #ef4444; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .pricing-box { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 30px; border-radius: 12px; margin: 20px 0; }
          .button { display: inline-block; background: #10b981; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 18px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="hero">
            <h1>⏰ Trial Ending Tomorrow</h1>
            <p style="font-size: 18px; margin: 10px 0 0 0;">Don't lose ${scholarName}'s progress!</p>
          </div>
          
          <div class="content">
            <p>Hi ${parentName},</p>
            
            <p>Your 7-day trial ends tomorrow. Here's what <strong>${scholarName}</strong> achieved:</p>
            
            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-number">${quizzesCompleted}</div>
                <div>Quizzes Completed</div>
              </div>
              <div class="stat-card">
                <div class="stat-number">${xpEarned}</div>
                <div>XP Earned</div>
              </div>
              <div class="stat-card">
                <div class="stat-number">${badgesEarned}</div>
                <div>Badges Unlocked</div>
              </div>
              <div class="stat-card">
                <div class="stat-number">${avgAccuracy}%</div>
                <div>Avg Accuracy</div>
              </div>
            </div>
            
            <div class="warning-box">
              <p style="margin: 0 0 15px 0; font-size: 18px; font-weight: bold; color: #dc2626;">🚨 What Happens After Trial:</p>
              <ul style="margin: 0; padding-left: 20px;">
                <li>❌ Quiz access locked</li>
                <li>❌ Progress tracking disabled</li>
                <li>❌ Badge collection stopped</li>
                <li>❌ Leaderboard removed</li>
              </ul>
            </div>
            
            <div class="pricing-box">
              <h2 style="margin: 0 0 20px 0; text-align: center;">Keep the Momentum Going!</h2>
              
              <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin: 20px 0;">
                <div style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 8px; text-align: center;">
                  <div style="font-size: 14px; opacity: 0.9;">Monthly</div>
                  <div style="font-size: 36px; font-weight: bold; margin: 10px 0;">£12.99</div>
                  <div style="font-size: 14px; opacity: 0.9;">/month</div>
                </div>
                <div style="background: rgba(255,255,255,0.2); padding: 20px; border-radius: 8px; text-align: center; border: 2px solid white;">
                  <div style="font-size: 14px; opacity: 0.9;">Annual</div>
                  <div style="font-size: 36px; font-weight: bold; margin: 10px 0;">£120</div>
                  <div style="font-size: 14px; opacity: 0.9;">/year (save £35!)</div>
                </div>
              </div>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://launchpard.com/subscribe" class="button">Subscribe Now →</a>
            </div>
            
            <p style="text-align: center; color: #64748b; font-size: 14px;">
              Questions? Reply to this email - we're here to help!
            </p>
            
            <p>Best,<br>
            <strong>The LaunchPard Team</strong></p>
          </div>
        </div>
      </body>
      </html>
    `
  }),

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. WEEKLY PROGRESS REPORT (Every Sunday)
  // ═══════════════════════════════════════════════════════════════════════════
  weeklyReport: (parentName, scholarName, weekData) => ({
    subject: `📊 ${scholarName}'s Week in Review`,
    htmlContent: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1e293b; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .hero { background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%); padding: 40px 20px; text-align: center; border-radius: 12px; color: white; }
          .content { background: white; padding: 30px; border-radius: 12px; margin-top: 20px; }
          .subject-bar { background: #f1f5f9; padding: 15px; border-radius: 8px; margin: 10px 0; }
          .progress-bar { background: #e2e8f0; height: 8px; border-radius: 4px; overflow: hidden; margin-top: 8px; }
          .progress-fill { background: linear-gradient(90deg, #6366f1 0%, #8b5cf6 100%); height: 100%; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="hero">
            <h1>📊 Weekly Progress Report</h1>
            <p style="font-size: 18px; margin: 10px 0 0 0;">${scholarName}'s Learning Journey</p>
          </div>
          
          <div class="content">
            <p>Hi ${parentName},</p>
            
            <p>Here's how <strong>${scholarName}</strong> performed this week:</p>
            
            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin: 0 0 15px 0;">This Week's Stats</h3>
              <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
                <div>
                  <div style="font-size: 14px; color: #64748b;">Quizzes</div>
                  <div style="font-size: 24px; font-weight: bold; color: #6366f1;">${weekData.quizzes}</div>
                </div>
                <div>
                  <div style="font-size: 14px; color: #64748b;">XP Earned</div>
                  <div style="font-size: 24px; font-weight: bold; color: #6366f1;">${weekData.xp}</div>
                </div>
                <div>
                  <div style="font-size: 14px; color: #64748b;">Accuracy</div>
                  <div style="font-size: 24px; font-weight: bold; color: #10b981;">${weekData.accuracy}%</div>
                </div>
                <div>
                  <div style="font-size: 14px; color: #64748b;">Streak</div>
                  <div style="font-size: 24px; font-weight: bold; color: #f59e0b;">${weekData.streak} days</div>
                </div>
              </div>
            </div>
            
            <h3>📚 Subjects Practiced:</h3>
            ${weekData.subjects.map(s => `
              <div class="subject-bar">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <span><strong>${s.name}</strong></span>
                  <span style="color: #6366f1; font-weight: bold;">${s.accuracy}%</span>
                </div>
                <div style="font-size: 14px; color: #64748b; margin-top: 4px;">${s.quizzes} quizzes</div>
                <div class="progress-bar">
                  <div class="progress-fill" style="width: ${s.accuracy}%"></div>
                </div>
              </div>
            `).join('')}
            
            ${weekData.badges.length > 0 ? `
              <h3>🏆 Badges Earned This Week:</h3>
              <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                ${weekData.badges.map(b => `
                  <div style="background: #f1f5f9; padding: 10px 15px; border-radius: 8px; font-weight: bold;">
                    ${b.icon} ${b.name}
                  </div>
                `).join('')}
              </div>
            ` : ''}
            
            <div style="background: #f0fdf4; border-left: 4px solid #10b981; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0;"><strong>💡 Insight:</strong> ${weekData.insight}</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://launchpard.com/dashboard/parent/analytics" 
                 style="display: inline-block; background: #6366f1; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                View Full Analytics →
              </a>
            </div>
            
            <p>Keep up the great work!</p>
            
            <p>Best,<br>
            <strong>The LaunchPard Team</strong></p>
          </div>
        </div>
      </body>
      </html>
    `
  })
};