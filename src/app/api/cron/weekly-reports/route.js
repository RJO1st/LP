import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendEmail } from '@/lib/email';
import { EMAIL_TEMPLATES } from '@/lib/emailTemplates';
import { supabaseKeys } from '@/lib/env'
import { getServiceRoleClient } from '@/lib/security/serviceRole'

export async function GET(request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getServiceRoleClient();

  try {
    // Get active subscribers only
    const { data: parents, error } = await supabase
      .from('parents')
      .select(`
        id,
        email,
        full_name
      `)
      .eq('subscription_status', 'active');

    if (error) throw error;

    console.log(`Sending weekly reports to ${parents.length} parents`);

    // Get date range for this week
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    for (const parent of parents) {
      // Get scholars for this parent
      const { data: scholars } = await supabase
        .from('scholars')
        .select('id, name, streak')
        .eq('parent_id', parent.id);

      if (!scholars || scholars.length === 0) continue;

      // Send report for first scholar (or loop through all)
      const scholar = scholars[0];

      // Get quiz results from this week
      const { data: quizResults } = await supabase
        .from('quiz_results')
        .select('score, total_questions, subject')
        .eq('scholar_id', scholar.id)
        .gte('completed_at', weekAgo.toISOString());

      if (!quizResults || quizResults.length === 0) continue;

      // Calculate stats
      const quizzes = quizResults.length;
      const totalScore = quizResults.reduce((sum, r) => sum + r.score, 0);
      const totalQuestions = quizResults.reduce((sum, r) => sum + r.total_questions, 0);
      const accuracy = Math.round((totalScore / totalQuestions) * 100);

      // Group by subject
      const subjectMap = {};
      quizResults.forEach(r => {
        if (!subjectMap[r.subject]) {
          subjectMap[r.subject] = { scores: [], quizzes: 0 };
        }
        subjectMap[r.subject].scores.push((r.score / r.total_questions) * 100);
        subjectMap[r.subject].quizzes++;
      });

      const subjects = Object.entries(subjectMap).map(([name, data]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        accuracy: Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length),
        quizzes: data.quizzes
      }));

      // Get badges earned this week
      const { data: badges } = await supabase
        .from('scholar_badges')
        .select('badge_id')
        .eq('scholar_id', scholar.id)
        .gte('earned_at', weekAgo.toISOString());

      const badgeData = badges?.map(b => ({
        icon: '🏆',
        name: b.badge_id
      })) || [];

      // Get XP from scholar
      const { data: scholarData } = await supabase
        .from('scholars')
        .select('total_xp')
        .eq('id', scholar.id)
        .single();

      // Generate insight
      const topSubject = subjects.sort((a, b) => b.accuracy - a.accuracy)[0];
      const insight = topSubject 
        ? `${scholar.name} excels at ${topSubject.name} with ${topSubject.accuracy}% accuracy!`
        : `${scholar.name} is making great progress!`;

      const weekData = {
        quizzes,
        xp: scholarData?.total_xp || 0,
        accuracy,
        streak: scholar.streak || 0,
        subjects,
        badges: badgeData,
        insight
      };

      // Send email
      const template = EMAIL_TEMPLATES.weeklyReport(
        parent.full_name,
        scholar.name,
        weekData
      );

      await sendEmail({
        to: [{ email: parent.email, name: parent.full_name }],
        subject: template.subject,
        htmlContent: template.htmlContent,
      });

      console.log(`Sent weekly report to ${parent.email}`);
    }

    return NextResponse.json({ 
      success: true, 
      sent: parents.length 
    });
  } catch (error) {
    console.error('Error in weekly reports cron:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}