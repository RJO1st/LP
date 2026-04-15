import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request, { params }) {
  const { schoolId } = params;

  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
        },
      }
    );

    // Fetch all classes in the school
    const { data: classes, error: classesError } = await supabase
      .from("classes")
      .select("id, name, year_level, school_id")
      .eq("school_id", schoolId);

    if (classesError) throw classesError;

    if (!classes || classes.length === 0) {
      return NextResponse.json({
        classes: [],
        schoolAverage: 0,
        totalScholars: 0,
        placementPrediction: null,
        trend: [],
        referralEarnings: 0,
      });
    }

    const classIds = classes.map((c) => c.id);

    // Fetch all scholars across classes
    const { data: allEnrolments, error: enrolError } = await supabase
      .from("enrolments")
      .select("scholar_id, class_id")
      .in("class_id", classIds);

    if (enrolError) throw enrolError;

    const scholarIds = [...new Set((allEnrolments || []).map((e) => e.scholar_id))];

    // Fetch scholar data
    const { data: scholars, error: scholarsError } = await supabase
      .from("scholars")
      .select("id, first_name, last_name")
      .in("id", scholarIds);

    if (scholarsError) throw scholarsError;

    // Fetch mastery data for school-wide average
    const { data: masteryData, error: masteryError } = await supabase
      .from("scholar_topic_mastery")
      .select("scholar_id, mastery_pct")
      .in("scholar_id", scholarIds)
      .gte("mastery_pct", 0);

    if (masteryError) throw masteryError;

    // Calculate per-scholar scores
    const scholarScores = {};
    (masteryData || []).forEach((row) => {
      if (!scholarScores[row.scholar_id]) {
        scholarScores[row.scholar_id] = [];
      }
      scholarScores[row.scholar_id].push(row.mastery_pct);
    });

    const studentReadinessByClass = {};
    (allEnrolments || []).forEach((e) => {
      if (!studentReadinessByClass[e.class_id]) {
        studentReadinessByClass[e.class_id] = [];
      }
      const scores = scholarScores[e.scholar_id] || [0];
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      studentReadinessByClass[e.class_id].push(avg);
    });

    // Build classes output with per-class stats
    const classesWithStats = classes.map((cls) => {
      const classReadiness = studentReadinessByClass[cls.id] || [];
      const avgReadiness = classReadiness.length > 0
        ? classReadiness.reduce((a, b) => a + b, 0) / classReadiness.length
        : 0;
      const percentReady = classReadiness.filter((r) => r >= 70).length / (classReadiness.length || 1) * 100;

      return {
        id: cls.id,
        name: cls.name,
        year_level: cls.year_level,
        studentCount: classReadiness.length,
        avgReadiness: Math.round(avgReadiness),
        percentReady: Math.round(percentReady),
        trend: (Math.random() * 6 - 3), // Dummy trend between -3 and +3
        weakTopics: [
          { name: "Fractions", average: Math.max(40, avgReadiness - 30) },
          { name: "Decimals", average: Math.max(45, avgReadiness - 25) },
          { name: "Word Problems", average: Math.max(50, avgReadiness - 20) },
        ],
      };
    });

    // School-wide average
    const allReadiness = Object.values(studentReadinessByClass).flat();
    const schoolAverage = allReadiness.length > 0
      ? Math.round(allReadiness.reduce((a, b) => a + b, 0) / allReadiness.length)
      : 0;

    // Placement prediction & trend
    const placementPrediction = Math.min(98, Math.round(schoolAverage * 1.08));
    const trend = [
      { month: "This Month", change: (Math.random() * 6 - 3) },
    ];

    // Referral earnings (count active parent subscriptions referred by school)
    // For now, dummy calculation
    const referralEarnings = (scholarIds.length || 0) * 1000;

    return NextResponse.json({
      classes: classesWithStats,
      schoolAverage,
      totalScholars: scholarIds.length,
      placementPrediction,
      trend,
      referralEarnings,
    });
  } catch (error) {
    console.error("Error in school overview route:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
