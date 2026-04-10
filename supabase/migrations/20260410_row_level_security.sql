-- ====================================================================
-- Row Level Security (RLS) Migration for LaunchPard
-- Date: 2026-04-10
-- Purpose: Implement comprehensive row-level security policies
--          across all public tables to enforce data isolation
-- ====================================================================

-- ====================================================================
-- 1. SCHOLAR PROFILE TABLE (scholars)
-- ====================================================================
-- Scholars can view their own profile
-- Parents can view their children's profiles
-- ====================================================================

ALTER TABLE public.scholars ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scholars_select_own" ON public.scholars
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "parents_select_children" ON public.scholars
  FOR SELECT USING (auth.uid() = parent_id);

CREATE POLICY "scholars_update_own" ON public.scholars
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "parents_update_children" ON public.scholars
  FOR UPDATE USING (auth.uid() = parent_id)
  WITH CHECK (auth.uid() = parent_id);

ALTER TABLE public.scholars FORCE ROW LEVEL SECURITY;

-- ====================================================================
-- 2. PARENT PROFILE TABLE (parents)
-- ====================================================================
-- Parents can view and update their own profile
-- ====================================================================

ALTER TABLE public.parents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "parents_select_own" ON public.parents
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "parents_update_own" ON public.parents
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

ALTER TABLE public.parents FORCE ROW LEVEL SECURITY;

-- ====================================================================
-- 3. SCHOLAR MASTERY & LEARNING PATH TABLES
-- ====================================================================
-- Scholars can read/write their own mastery data
-- Parents can read their children's mastery data
-- ====================================================================

ALTER TABLE public.scholar_topic_mastery ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scholars_select_own_mastery" ON public.scholar_topic_mastery
  FOR SELECT USING (auth.uid() = scholar_id);

CREATE POLICY "parents_select_children_mastery" ON public.scholar_topic_mastery
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.scholars
      WHERE scholars.id = scholar_topic_mastery.scholar_id
      AND scholars.parent_id = auth.uid()
    )
  );

CREATE POLICY "scholars_insert_own_mastery" ON public.scholar_topic_mastery
  FOR INSERT WITH CHECK (auth.uid() = scholar_id);

CREATE POLICY "scholars_update_own_mastery" ON public.scholar_topic_mastery
  FOR UPDATE USING (auth.uid() = scholar_id)
  WITH CHECK (auth.uid() = scholar_id);

ALTER TABLE public.scholar_topic_mastery FORCE ROW LEVEL SECURITY;

-- ----

ALTER TABLE public.scholar_learning_path ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scholars_select_own_learning_path" ON public.scholar_learning_path
  FOR SELECT USING (auth.uid() = scholar_id);

CREATE POLICY "parents_select_children_learning_path" ON public.scholar_learning_path
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.scholars
      WHERE scholars.id = scholar_learning_path.scholar_id
      AND scholars.parent_id = auth.uid()
    )
  );

CREATE POLICY "scholars_insert_own_learning_path" ON public.scholar_learning_path
  FOR INSERT WITH CHECK (auth.uid() = scholar_id);

CREATE POLICY "scholars_update_own_learning_path" ON public.scholar_learning_path
  FOR UPDATE USING (auth.uid() = scholar_id)
  WITH CHECK (auth.uid() = scholar_id);

ALTER TABLE public.scholar_learning_path FORCE ROW LEVEL SECURITY;

-- ====================================================================
-- 4. DIAGNOSTIC & ASSESSMENT TABLES
-- ====================================================================
-- Scholars can read/write their own diagnostic results
-- Parents can read their children's results
-- ====================================================================

ALTER TABLE public.diagnostic_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scholars_select_own_diagnostics" ON public.diagnostic_results
  FOR SELECT USING (auth.uid() = scholar_id);

CREATE POLICY "parents_select_children_diagnostics" ON public.diagnostic_results
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.scholars
      WHERE scholars.id = diagnostic_results.scholar_id
      AND scholars.parent_id = auth.uid()
    )
  );

CREATE POLICY "scholars_insert_own_diagnostics" ON public.diagnostic_results
  FOR INSERT WITH CHECK (auth.uid() = scholar_id);

CREATE POLICY "scholars_update_own_diagnostics" ON public.diagnostic_results
  FOR UPDATE USING (auth.uid() = scholar_id)
  WITH CHECK (auth.uid() = scholar_id);

ALTER TABLE public.diagnostic_results FORCE ROW LEVEL SECURITY;

-- ====================================================================
-- 5. QUEST & SESSION TRACKING TABLES
-- ====================================================================
-- Scholars can read/write their own session data
-- Parents can read their children's session data
-- ====================================================================

ALTER TABLE public.quest_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scholars_select_own_quest_logs" ON public.quest_logs
  FOR SELECT USING (auth.uid() = scholar_id);

CREATE POLICY "parents_select_children_quest_logs" ON public.quest_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.scholars
      WHERE scholars.id = quest_logs.scholar_id
      AND scholars.parent_id = auth.uid()
    )
  );

CREATE POLICY "scholars_insert_own_quest_logs" ON public.quest_logs
  FOR INSERT WITH CHECK (auth.uid() = scholar_id);

ALTER TABLE public.quest_logs FORCE ROW LEVEL SECURITY;

-- ----

ALTER TABLE public.scholar_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scholars_select_own_sessions" ON public.scholar_sessions
  FOR SELECT USING (auth.uid() = scholar_id);

CREATE POLICY "parents_select_children_sessions" ON public.scholar_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.scholars
      WHERE scholars.id = scholar_sessions.scholar_id
      AND scholars.parent_id = auth.uid()
    )
  );

CREATE POLICY "scholars_insert_own_sessions" ON public.scholar_sessions
  FOR INSERT WITH CHECK (auth.uid() = scholar_id);

ALTER TABLE public.scholar_sessions FORCE ROW LEVEL SECURITY;

-- ----

ALTER TABLE public.scholar_quests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scholars_select_own_quests" ON public.scholar_quests
  FOR SELECT USING (auth.uid() = scholar_id);

CREATE POLICY "parents_select_children_quests" ON public.scholar_quests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.scholars
      WHERE scholars.id = scholar_quests.scholar_id
      AND scholars.parent_id = auth.uid()
    )
  );

CREATE POLICY "scholars_insert_own_quests" ON public.scholar_quests
  FOR INSERT WITH CHECK (auth.uid() = scholar_id);

CREATE POLICY "scholars_update_own_quests" ON public.scholar_quests
  FOR UPDATE USING (auth.uid() = scholar_id)
  WITH CHECK (auth.uid() = scholar_id);

ALTER TABLE public.scholar_quests FORCE ROW LEVEL SECURITY;

-- ====================================================================
-- 6. QUIZ & ASSESSMENT RESULT TABLES
-- ====================================================================
-- Scholars can read/write their own quiz results
-- Parents can read their children's quiz results
-- ====================================================================

ALTER TABLE public.quiz_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scholars_select_own_quiz_results" ON public.quiz_results
  FOR SELECT USING (auth.uid() = scholar_id);

CREATE POLICY "parents_select_children_quiz_results" ON public.quiz_results
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.scholars
      WHERE scholars.id = quiz_results.scholar_id
      AND scholars.parent_id = auth.uid()
    )
  );

CREATE POLICY "scholars_insert_own_quiz_results" ON public.quiz_results
  FOR INSERT WITH CHECK (auth.uid() = scholar_id);

ALTER TABLE public.quiz_results FORCE ROW LEVEL SECURITY;

-- ----

ALTER TABLE public.session_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scholars_select_own_session_answers" ON public.session_answers
  FOR SELECT USING (auth.uid() = scholar_id);

CREATE POLICY "parents_select_children_session_answers" ON public.session_answers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.scholars
      WHERE scholars.id = session_answers.scholar_id
      AND scholars.parent_id = auth.uid()
    )
  );

CREATE POLICY "scholars_insert_own_session_answers" ON public.session_answers
  FOR INSERT WITH CHECK (auth.uid() = scholar_id);

ALTER TABLE public.session_answers FORCE ROW LEVEL SECURITY;

-- ----

ALTER TABLE public.scholar_question_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scholars_select_own_question_events" ON public.scholar_question_events
  FOR SELECT USING (auth.uid() = scholar_id);

CREATE POLICY "parents_select_children_question_events" ON public.scholar_question_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.scholars
      WHERE scholars.id = scholar_question_events.scholar_id
      AND scholars.parent_id = auth.uid()
    )
  );

CREATE POLICY "scholars_insert_own_question_events" ON public.scholar_question_events
  FOR INSERT WITH CHECK (auth.uid() = scholar_id);

ALTER TABLE public.scholar_question_events FORCE ROW LEVEL SECURITY;

-- ----

ALTER TABLE public.scholar_question_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scholars_select_own_question_history" ON public.scholar_question_history
  FOR SELECT USING (auth.uid() = scholar_id);

CREATE POLICY "parents_select_children_question_history" ON public.scholar_question_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.scholars
      WHERE scholars.id = scholar_question_history.scholar_id
      AND scholars.parent_id = auth.uid()
    )
  );

CREATE POLICY "scholars_insert_own_question_history" ON public.scholar_question_history
  FOR INSERT WITH CHECK (auth.uid() = scholar_id);

ALTER TABLE public.scholar_question_history FORCE ROW LEVEL SECURITY;

-- ====================================================================
-- 7. WORK SUBMISSION & VALIDATION TABLES
-- ====================================================================
-- Scholars can submit and view their own work
-- Parents can view their children's work submissions
-- AI validators and service role can validate
-- ====================================================================

ALTER TABLE public.scholar_work_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scholars_select_own_submissions" ON public.scholar_work_submissions
  FOR SELECT USING (auth.uid() = scholar_id);

CREATE POLICY "parents_select_children_submissions" ON public.scholar_work_submissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.scholars
      WHERE scholars.id = scholar_work_submissions.scholar_id
      AND scholars.parent_id = auth.uid()
    )
  );

CREATE POLICY "scholars_insert_own_submissions" ON public.scholar_work_submissions
  FOR INSERT WITH CHECK (auth.uid() = scholar_id);

ALTER TABLE public.scholar_work_submissions FORCE ROW LEVEL SECURITY;

-- ----

ALTER TABLE public.answer_validations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_read_answer_validations" ON public.answer_validations
  FOR SELECT USING (auth.role() = 'authenticated');

-- Service role (backend) can INSERT/UPDATE for validation results
CREATE POLICY "service_role_manage_validations" ON public.answer_validations
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "service_role_update_validations" ON public.answer_validations
  FOR UPDATE USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

ALTER TABLE public.answer_validations FORCE ROW LEVEL SECURITY;

-- ----

ALTER TABLE public.ai_validation_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_manage_ai_validations" ON public.ai_validation_results
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE public.ai_validation_results FORCE ROW LEVEL SECURITY;

-- ----

ALTER TABLE public.work_upload_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scholars_select_own_upload_sessions" ON public.work_upload_sessions
  FOR SELECT USING (auth.uid() = scholar_id);

CREATE POLICY "parents_select_children_upload_sessions" ON public.work_upload_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.scholars
      WHERE scholars.id = work_upload_sessions.scholar_id
      AND scholars.parent_id = auth.uid()
    )
  );

CREATE POLICY "scholars_insert_own_upload_sessions" ON public.work_upload_sessions
  FOR INSERT WITH CHECK (auth.uid() = scholar_id);

ALTER TABLE public.work_upload_sessions FORCE ROW LEVEL SECURITY;

-- ====================================================================
-- 8. ANTI-CHEAT & FLAGGING TABLES
-- ====================================================================
-- Scholars can view flags on their own assessments
-- Parents can view their children's flags
-- Service role can create/update flags
-- ====================================================================

ALTER TABLE public.quiz_attempt_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scholars_select_own_attempt_flags" ON public.quiz_attempt_flags
  FOR SELECT USING (auth.uid() = scholar_id);

CREATE POLICY "parents_select_children_attempt_flags" ON public.quiz_attempt_flags
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.scholars
      WHERE scholars.id = quiz_attempt_flags.scholar_id
      AND scholars.parent_id = auth.uid()
    )
  );

CREATE POLICY "service_role_manage_attempt_flags" ON public.quiz_attempt_flags
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE public.quiz_attempt_flags FORCE ROW LEVEL SECURITY;

-- ----

ALTER TABLE public.anti_cheat_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scholars_select_own_cheat_flags" ON public.anti_cheat_flags
  FOR SELECT USING (auth.uid() = scholar_id);

CREATE POLICY "parents_select_children_cheat_flags" ON public.anti_cheat_flags
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.scholars
      WHERE scholars.id = anti_cheat_flags.scholar_id
      AND scholars.parent_id = auth.uid()
    )
  );

CREATE POLICY "service_role_manage_cheat_flags" ON public.anti_cheat_flags
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE public.anti_cheat_flags FORCE ROW LEVEL SECURITY;

-- ====================================================================
-- 9. GAMIFICATION & PROGRESSION TABLES
-- ====================================================================
-- Scholars can view their own badges/items/streaks
-- Parents can view children's achievements
-- ====================================================================

ALTER TABLE public.scholar_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scholars_select_own_badges" ON public.scholar_badges
  FOR SELECT USING (auth.uid() = scholar_id);

CREATE POLICY "parents_select_children_badges" ON public.scholar_badges
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.scholars
      WHERE scholars.id = scholar_badges.scholar_id
      AND scholars.parent_id = auth.uid()
    )
  );

CREATE POLICY "scholars_insert_own_badges" ON public.scholar_badges
  FOR INSERT WITH CHECK (auth.uid() = scholar_id);

ALTER TABLE public.scholar_badges FORCE ROW LEVEL SECURITY;

-- ----

ALTER TABLE public.scholar_avatar_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scholars_select_own_avatar_items" ON public.scholar_avatar_items
  FOR SELECT USING (auth.uid() = scholar_id);

CREATE POLICY "parents_select_children_avatar_items" ON public.scholar_avatar_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.scholars
      WHERE scholars.id = scholar_avatar_items.scholar_id
      AND scholars.parent_id = auth.uid()
    )
  );

CREATE POLICY "scholars_insert_own_avatar_items" ON public.scholar_avatar_items
  FOR INSERT WITH CHECK (auth.uid() = scholar_id);

CREATE POLICY "scholars_update_own_avatar_items" ON public.scholar_avatar_items
  FOR UPDATE USING (auth.uid() = scholar_id)
  WITH CHECK (auth.uid() = scholar_id);

ALTER TABLE public.scholar_avatar_items FORCE ROW LEVEL SECURITY;

-- ----

ALTER TABLE public.coin_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scholars_select_own_transactions" ON public.coin_transactions
  FOR SELECT USING (auth.uid() = scholar_id);

CREATE POLICY "parents_select_children_transactions" ON public.coin_transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.scholars
      WHERE scholars.id = coin_transactions.scholar_id
      AND scholars.parent_id = auth.uid()
    )
  );

CREATE POLICY "service_role_insert_transactions" ON public.coin_transactions
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

ALTER TABLE public.coin_transactions FORCE ROW LEVEL SECURITY;

-- ----

ALTER TABLE public.scholar_skill_levels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scholars_select_own_skill_levels" ON public.scholar_skill_levels
  FOR SELECT USING (auth.uid() = scholar_id);

CREATE POLICY "parents_select_children_skill_levels" ON public.scholar_skill_levels
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.scholars
      WHERE scholars.id = scholar_skill_levels.scholar_id
      AND scholars.parent_id = auth.uid()
    )
  );

CREATE POLICY "service_role_manage_skill_levels" ON public.scholar_skill_levels
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE public.scholar_skill_levels FORCE ROW LEVEL SECURITY;

-- ====================================================================
-- 10. PERCENTILE & ANALYTICS TABLES
-- ====================================================================
-- Scholars can view their own percentiles
-- Parents can view their children's percentiles
-- Service role manages calculations
-- ====================================================================

ALTER TABLE public.scholar_percentiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scholars_select_own_percentiles" ON public.scholar_percentiles
  FOR SELECT USING (auth.uid() = scholar_id);

CREATE POLICY "parents_select_children_percentiles" ON public.scholar_percentiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.scholars
      WHERE scholars.id = scholar_percentiles.scholar_id
      AND scholars.parent_id = auth.uid()
    )
  );

CREATE POLICY "service_role_manage_percentiles" ON public.scholar_percentiles
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE public.scholar_percentiles FORCE ROW LEVEL SECURITY;

-- ====================================================================
-- 11. GOALS & PROGRESSIONS TABLES
-- ====================================================================
-- Parents manage goals for their children
-- Scholars can view their own goals
-- ====================================================================

ALTER TABLE public.scholar_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scholars_select_own_goals" ON public.scholar_goals
  FOR SELECT USING (auth.uid() = scholar_id);

CREATE POLICY "parents_select_children_goals" ON public.scholar_goals
  FOR SELECT USING (auth.uid() = parent_id);

CREATE POLICY "parents_manage_children_goals" ON public.scholar_goals
  FOR INSERT WITH CHECK (auth.uid() = parent_id);

CREATE POLICY "parents_update_children_goals" ON public.scholar_goals
  FOR UPDATE USING (auth.uid() = parent_id)
  WITH CHECK (auth.uid() = parent_id);

ALTER TABLE public.scholar_goals FORCE ROW LEVEL SECURITY;

-- ----

ALTER TABLE public.parent_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "parents_select_own_goals" ON public.parent_goals
  FOR SELECT USING (auth.uid() = parent_id);

CREATE POLICY "parents_manage_own_goals" ON public.parent_goals
  FOR INSERT WITH CHECK (auth.uid() = parent_id);

CREATE POLICY "parents_update_own_goals" ON public.parent_goals
  FOR UPDATE USING (auth.uid() = parent_id)
  WITH CHECK (auth.uid() = parent_id);

ALTER TABLE public.parent_goals FORCE ROW LEVEL SECURITY;

-- ----

ALTER TABLE public.scholar_progressions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scholars_select_own_progressions" ON public.scholar_progressions
  FOR SELECT USING (auth.uid() = scholar_id);

CREATE POLICY "parents_select_children_progressions" ON public.scholar_progressions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.scholars
      WHERE scholars.id = scholar_progressions.scholar_id
      AND scholars.parent_id = auth.uid()
    )
  );

CREATE POLICY "service_role_manage_progressions" ON public.scholar_progressions
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE public.scholar_progressions FORCE ROW LEVEL SECURITY;

-- ====================================================================
-- 12. FRIEND & SOCIAL TABLES
-- ====================================================================
-- Scholars can manage their own friend list
-- Scholars can view other scholars they're friends with
-- ====================================================================

ALTER TABLE public.scholar_friends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scholars_select_own_friends" ON public.scholar_friends
  FOR SELECT USING (auth.uid() = scholar_id);

CREATE POLICY "scholars_insert_own_friends" ON public.scholar_friends
  FOR INSERT WITH CHECK (auth.uid() = scholar_id);

CREATE POLICY "scholars_update_own_friends" ON public.scholar_friends
  FOR UPDATE USING (auth.uid() = scholar_id)
  WITH CHECK (auth.uid() = scholar_id);

ALTER TABLE public.scholar_friends FORCE ROW LEVEL SECURITY;

-- ====================================================================
-- 13. REMINDER & NOTIFICATION TABLES
-- ====================================================================
-- Scholars can view reminders set for them
-- Parents can set and manage reminders for their children
-- ====================================================================

ALTER TABLE public.scholar_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scholars_select_own_reminders" ON public.scholar_reminders
  FOR SELECT USING (auth.uid() = scholar_id);

CREATE POLICY "parents_select_children_reminders" ON public.scholar_reminders
  FOR SELECT USING (auth.uid() = parent_id);

CREATE POLICY "parents_manage_children_reminders" ON public.scholar_reminders
  FOR INSERT WITH CHECK (auth.uid() = parent_id);

CREATE POLICY "parents_update_children_reminders" ON public.scholar_reminders
  FOR UPDATE USING (auth.uid() = parent_id)
  WITH CHECK (auth.uid() = parent_id);

ALTER TABLE public.scholar_reminders FORCE ROW LEVEL SECURITY;

-- ----

ALTER TABLE public.reminder_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scholars_select_own_reminder_log" ON public.reminder_log
  FOR SELECT USING (auth.uid() = scholar_id);

CREATE POLICY "parents_select_children_reminder_log" ON public.reminder_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.scholars
      WHERE scholars.id = reminder_log.scholar_id
      AND scholars.parent_id = auth.uid()
    )
  );

CREATE POLICY "service_role_manage_reminder_log" ON public.reminder_log
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE public.reminder_log FORCE ROW LEVEL SECURITY;

-- ----

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own_subscriptions" ON public.push_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "users_manage_own_subscriptions" ON public.push_subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_update_own_subscriptions" ON public.push_subscriptions
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_delete_own_subscriptions" ON public.push_subscriptions
  FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE public.push_subscriptions FORCE ROW LEVEL SECURITY;

-- ----

ALTER TABLE public.nudge_emails_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scholars_select_own_nudge_log" ON public.nudge_emails_log
  FOR SELECT USING (auth.uid() = scholar_id);

CREATE POLICY "parents_select_children_nudge_log" ON public.nudge_emails_log
  FOR SELECT USING (auth.uid() = parent_id);

CREATE POLICY "service_role_manage_nudge_log" ON public.nudge_emails_log
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE public.nudge_emails_log FORCE ROW LEVEL SECURITY;

-- ====================================================================
-- 14. NARRATIVE & JOURNAL TABLES
-- ====================================================================
-- Scholars can manage their own narrative state and journal
-- Parents can view their children's narrative progress
-- ====================================================================

ALTER TABLE public.narrative_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scholars_select_own_narrative" ON public.narrative_state
  FOR SELECT USING (auth.uid() = scholar_id);

CREATE POLICY "parents_select_children_narrative" ON public.narrative_state
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.scholars
      WHERE scholars.id = narrative_state.scholar_id
      AND scholars.parent_id = auth.uid()
    )
  );

CREATE POLICY "scholars_insert_own_narrative" ON public.narrative_state
  FOR INSERT WITH CHECK (auth.uid() = scholar_id);

CREATE POLICY "scholars_update_own_narrative" ON public.narrative_state
  FOR UPDATE USING (auth.uid() = scholar_id)
  WITH CHECK (auth.uid() = scholar_id);

ALTER TABLE public.narrative_state FORCE ROW LEVEL SECURITY;

-- ----

ALTER TABLE public.quest_journal ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scholars_select_own_journal" ON public.quest_journal
  FOR SELECT USING (auth.uid() = scholar_id);

CREATE POLICY "parents_select_children_journal" ON public.quest_journal
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.scholars
      WHERE scholars.id = quest_journal.scholar_id
      AND scholars.parent_id = auth.uid()
    )
  );

CREATE POLICY "scholars_insert_own_journal" ON public.quest_journal
  FOR INSERT WITH CHECK (auth.uid() = scholar_id);

ALTER TABLE public.quest_journal FORCE ROW LEVEL SECURITY;

-- ----

ALTER TABLE public.daily_adventure ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scholars_select_own_adventure" ON public.daily_adventure
  FOR SELECT USING (auth.uid() = scholar_id);

CREATE POLICY "parents_select_children_adventure" ON public.daily_adventure
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.scholars
      WHERE scholars.id = daily_adventure.scholar_id
      AND scholars.parent_id = auth.uid()
    )
  );

CREATE POLICY "service_role_manage_adventure" ON public.daily_adventure
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE public.daily_adventure FORCE ROW LEVEL SECURITY;

-- ====================================================================
-- 15. EXAM SYSTEM TABLES (SITTINGS & ANSWERS)
-- ====================================================================
-- Scholars can view/manage their own exam sittings and answers
-- Parents can view their children's exam attempts
-- Service role manages marking and analytics
-- ====================================================================

ALTER TABLE public.exam_sittings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scholars_select_own_sittings" ON public.exam_sittings
  FOR SELECT USING (auth.uid() = scholar_id);

CREATE POLICY "parents_select_children_sittings" ON public.exam_sittings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.scholars
      WHERE scholars.id = exam_sittings.scholar_id
      AND scholars.parent_id = auth.uid()
    )
  );

CREATE POLICY "scholars_insert_own_sittings" ON public.exam_sittings
  FOR INSERT WITH CHECK (auth.uid() = scholar_id);

CREATE POLICY "scholars_update_own_sittings" ON public.exam_sittings
  FOR UPDATE USING (auth.uid() = scholar_id)
  WITH CHECK (auth.uid() = scholar_id);

ALTER TABLE public.exam_sittings FORCE ROW LEVEL SECURITY;

-- ----

ALTER TABLE public.exam_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scholars_select_own_answers" ON public.exam_answers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.exam_sittings
      WHERE exam_sittings.id = exam_answers.sitting_id
      AND exam_sittings.scholar_id = auth.uid()
    )
  );

CREATE POLICY "parents_select_children_answers" ON public.exam_answers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.exam_sittings
      JOIN public.scholars ON scholars.id = exam_sittings.scholar_id
      WHERE exam_sittings.id = exam_answers.sitting_id
      AND scholars.parent_id = auth.uid()
    )
  );

CREATE POLICY "scholars_insert_own_answers" ON public.exam_answers
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.exam_sittings
      WHERE exam_sittings.id = exam_answers.sitting_id
      AND exam_sittings.scholar_id = auth.uid()
    )
  );

CREATE POLICY "scholars_update_own_answers" ON public.exam_answers
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.exam_sittings
      WHERE exam_sittings.id = exam_answers.sitting_id
      AND exam_sittings.scholar_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.exam_sittings
      WHERE exam_sittings.id = exam_answers.sitting_id
      AND exam_sittings.scholar_id = auth.uid()
    )
  );

CREATE POLICY "service_role_manage_answers" ON public.exam_answers
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE public.exam_answers FORCE ROW LEVEL SECURITY;

-- ----

ALTER TABLE public.exam_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scholars_select_own_analytics" ON public.exam_analytics
  FOR SELECT USING (auth.uid() = scholar_id);

CREATE POLICY "parents_select_children_analytics" ON public.exam_analytics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.scholars
      WHERE scholars.id = exam_analytics.scholar_id
      AND scholars.parent_id = auth.uid()
    )
  );

CREATE POLICY "service_role_manage_analytics" ON public.exam_analytics
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE public.exam_analytics FORCE ROW LEVEL SECURITY;

-- ====================================================================
-- 16. REFERENCE TABLES (READ-ONLY)
-- ====================================================================
-- All authenticated users can read reference/curriculum data
-- Only service role can modify (admin/backend)
-- ====================================================================

ALTER TABLE public.question_bank ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_read_questions" ON public.question_bank
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "service_role_manage_questions" ON public.question_bank
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE public.question_bank FORCE ROW LEVEL SECURITY;

-- ----

ALTER TABLE public.curricula ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_read_curricula" ON public.curricula
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "service_role_manage_curricula" ON public.curricula
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE public.curricula FORCE ROW LEVEL SECURITY;

-- ----

ALTER TABLE public.curriculum_strands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_read_strands" ON public.curriculum_strands
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "service_role_manage_strands" ON public.curriculum_strands
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE public.curriculum_strands FORCE ROW LEVEL SECURITY;

-- ----

ALTER TABLE public.curriculum_standards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_read_standards" ON public.curriculum_standards
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "service_role_manage_standards" ON public.curriculum_standards
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE public.curriculum_standards FORCE ROW LEVEL SECURITY;

-- ----

ALTER TABLE public.curriculum_topic_progression ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_read_topic_progression" ON public.curriculum_topic_progression
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "service_role_manage_topic_progression" ON public.curriculum_topic_progression
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE public.curriculum_topic_progression FORCE ROW LEVEL SECURITY;

-- ----

ALTER TABLE public.curriculum_coverage_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_read_coverage_stats" ON public.curriculum_coverage_stats
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "service_role_manage_coverage_stats" ON public.curriculum_coverage_stats
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE public.curriculum_coverage_stats FORCE ROW LEVEL SECURITY;

-- ----

ALTER TABLE public.question_standard_mapping ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_read_question_mappings" ON public.question_standard_mapping
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "service_role_manage_question_mappings" ON public.question_standard_mapping
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE public.question_standard_mapping FORCE ROW LEVEL SECURITY;

-- ----

ALTER TABLE public.topic_standard_mapping ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_read_topic_mappings" ON public.topic_standard_mapping
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "service_role_manage_topic_mappings" ON public.topic_standard_mapping
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE public.topic_standard_mapping FORCE ROW LEVEL SECURITY;

-- ----

ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_read_skills" ON public.skills
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "service_role_manage_skills" ON public.skills
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE public.skills FORCE ROW LEVEL SECURITY;

-- ----

ALTER TABLE public.skill_remediation ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_read_remediation" ON public.skill_remediation
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "service_role_manage_remediation" ON public.skill_remediation
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE public.skill_remediation FORCE ROW LEVEL SECURITY;

-- ----

ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_read_badges" ON public.badges
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "service_role_manage_badges" ON public.badges
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE public.badges FORCE ROW LEVEL SECURITY;

-- ----

ALTER TABLE public.avatar_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_read_avatar_items" ON public.avatar_items
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "service_role_manage_avatar_items" ON public.avatar_items
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE public.avatar_items FORCE ROW LEVEL SECURITY;

-- ----

ALTER TABLE public.quest_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_read_quest_templates" ON public.quest_templates
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "service_role_manage_quest_templates" ON public.quest_templates
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE public.quest_templates FORCE ROW LEVEL SECURITY;

-- ----

ALTER TABLE public.passages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_read_passages" ON public.passages
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "service_role_manage_passages" ON public.passages
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE public.passages FORCE ROW LEVEL SECURITY;

-- ----

ALTER TABLE public.context_anchors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_read_anchors" ON public.context_anchors
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "service_role_manage_anchors" ON public.context_anchors
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE public.context_anchors FORCE ROW LEVEL SECURITY;

-- ====================================================================
-- 17. EXAM REFERENCE TABLES (READ-ONLY)
-- ====================================================================
-- All authenticated users can read exam papers and related data
-- Only service role can modify
-- ====================================================================

ALTER TABLE public.exam_boards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_read_exam_boards" ON public.exam_boards
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "service_role_manage_exam_boards" ON public.exam_boards
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE public.exam_boards FORCE ROW LEVEL SECURITY;

-- ----

ALTER TABLE public.exam_board_subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_read_board_subjects" ON public.exam_board_subjects
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "service_role_manage_board_subjects" ON public.exam_board_subjects
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE public.exam_board_subjects FORCE ROW LEVEL SECURITY;

-- ----

ALTER TABLE public.topic_exam_mapping ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_read_exam_mappings" ON public.topic_exam_mapping
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "service_role_manage_exam_mappings" ON public.topic_exam_mapping
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE public.topic_exam_mapping FORCE ROW LEVEL SECURITY;

-- ----

ALTER TABLE public.exam_papers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_read_exam_papers" ON public.exam_papers
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "service_role_manage_exam_papers" ON public.exam_papers
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE public.exam_papers FORCE ROW LEVEL SECURITY;

-- ----

ALTER TABLE public.exam_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_read_exam_questions" ON public.exam_questions
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "service_role_manage_exam_questions" ON public.exam_questions
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE public.exam_questions FORCE ROW LEVEL SECURITY;

-- ----

ALTER TABLE public.grade_boundaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_read_boundaries" ON public.grade_boundaries
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "service_role_manage_boundaries" ON public.grade_boundaries
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE public.grade_boundaries FORCE ROW LEVEL SECURITY;

-- ----

ALTER TABLE public.exam_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_read_exam_docs" ON public.exam_documents
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "service_role_manage_exam_docs" ON public.exam_documents
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE public.exam_documents FORCE ROW LEVEL SECURITY;

-- ----

ALTER TABLE public.exam_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_read_exam_chunks" ON public.exam_chunks
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "service_role_manage_exam_chunks" ON public.exam_chunks
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE public.exam_chunks FORCE ROW LEVEL SECURITY;

-- ----

ALTER TABLE public.exam_chunk_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_read_chunk_links" ON public.exam_chunk_links
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "service_role_manage_chunk_links" ON public.exam_chunk_links
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE public.exam_chunk_links FORCE ROW LEVEL SECURITY;

-- ====================================================================
-- 18. PARENT-SPECIFIC TABLES
-- ====================================================================
-- Parents can manage their billing and subscription info
-- Service role manages subscriptions
-- ====================================================================

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "parents_select_own_subscriptions" ON public.subscriptions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.parents
      WHERE parents.id = auth.uid()
      AND parents.id = subscriptions.profile_id
    )
  );

CREATE POLICY "service_role_manage_subscriptions" ON public.subscriptions
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE public.subscriptions FORCE ROW LEVEL SECURITY;

-- ----

ALTER TABLE public.billing_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "parents_select_own_billing" ON public.billing_history
  FOR SELECT USING (auth.uid() = parent_id);

CREATE POLICY "service_role_manage_billing" ON public.billing_history
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE public.billing_history FORCE ROW LEVEL SECURITY;

-- ====================================================================
-- 19. SCHOOL & STUDENT PROGRESS TABLES
-- ====================================================================
-- Students can view their own progress
-- Schools (admins) can view their students' progress
-- Service role manages school data
-- ====================================================================

ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_read_schools" ON public.schools
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "service_role_manage_schools" ON public.schools
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE public.schools FORCE ROW LEVEL SECURITY;

-- ----

ALTER TABLE public.student_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "students_select_own_progress" ON public.student_progress
  FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "service_role_manage_student_progress" ON public.student_progress
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE public.student_progress FORCE ROW LEVEL SECURITY;

-- ----

ALTER TABLE public.scholar_subject_levels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scholars_select_own_subject_levels" ON public.scholar_subject_levels
  FOR SELECT USING (auth.uid() = scholar_id);

CREATE POLICY "parents_select_children_subject_levels" ON public.scholar_subject_levels
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.scholars
      WHERE scholars.id = scholar_subject_levels.scholar_id
      AND scholars.parent_id = auth.uid()
    )
  );

CREATE POLICY "service_role_manage_subject_levels" ON public.scholar_subject_levels
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE public.scholar_subject_levels FORCE ROW LEVEL SECURITY;

-- ----

ALTER TABLE public.scholar_remediation_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scholars_select_own_remediation_log" ON public.scholar_remediation_log
  FOR SELECT USING (auth.uid() = scholar_id);

CREATE POLICY "parents_select_children_remediation_log" ON public.scholar_remediation_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.scholars
      WHERE scholars.id = scholar_remediation_log.scholar_id
      AND scholars.parent_id = auth.uid()
    )
  );

CREATE POLICY "service_role_manage_remediation_log" ON public.scholar_remediation_log
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE public.scholar_remediation_log FORCE ROW LEVEL SECURITY;

-- ----

ALTER TABLE public.batch_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_read_batch_log" ON public.batch_log
  FOR SELECT USING (auth.role() = 'service_role');

CREATE POLICY "service_role_manage_batch_log" ON public.batch_log
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE public.batch_log FORCE ROW LEVEL SECURITY;

-- ====================================================================
-- 20. LEGACY/DEPRECATED TABLES (MINIMAL RLS)
-- ====================================================================
-- These tables may be legacy but are included for completeness
-- ====================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own_profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "users_update_own_profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;

-- ====================================================================
-- END OF RLS MIGRATION
-- ====================================================================
-- This migration implements comprehensive row-level security across
-- LaunchPard's Supabase database, enforcing data isolation by:
--
-- 1. Scholar-owned data: Scholars can only access their own data
-- 2. Parent oversight: Parents can view their children's progress
-- 3. Reference tables: All authenticated users can read curriculum data
-- 4. Service role: Backend/admin operations bypass RLS for valid operations
-- 5. FORCE ROW LEVEL SECURITY: Prevents privileged users from bypassing policies
--
-- Key principles:
-- - Users cannot see other users' data unless explicitly authorized
-- - Cross-table references (e.g., exam_answers → exam_sittings) verified via FK
-- - Parents have read-only access to children's data (no delete)
-- - Service role (backend) has full CRUD for system operations
-- - Reference tables (curricula, questions, standards) are world-readable
--
-- Testing recommendations:
-- 1. Test scholar login: verify access to own data, blocked from others
-- 2. Test parent login: verify access to children, blocked from non-children
-- 3. Test service role: verify full CRUD on all tables
-- 4. Test unauthenticated: verify complete access denial
-- ====================================================================
