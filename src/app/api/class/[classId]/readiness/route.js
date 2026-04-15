import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request, { params }) {
  const { classId } = params;

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

    // Fetch all scholars in the class
    const { data: enrolments, error: enrolError } = await supabase
      .from("enrolments")
      .select("scholar_id")
      .eq("class_id", classId);

    if (enrolError) throw enrolError;

    if (!enrolments || enrolments.length === 0) {
      return NextResponse.json({
        classAverage: 0,
        students: [],
        gradeDistribution: {
          exceptional: 0,
          ready: 0,
          developing: 0,
          struggling: 0,
        },
        topicWeaknesses: [],
        strugglingList: [],
        readyList: [],
      });
    }

    const scholarIds = enrolments.map((e) => e.scholar_id);

    // Fetch scholar mastery data
    const { data: scholars, error: scholarsError } = await supabase
      .from("scholars")
      .select("id, first_name, last_name")
      .in("id", scholarIds);

    if (scholarsError) throw scholarsError;

    // Fetch topic mastery for all scholars (dummy data; adapt to your schema)
    const { data: masteryData, error: masteryError } = await supabase
      .from("scholar_topic_mastery")
      .select("scholar_id, topic, mastery_pct")
      .in("scholar_id", scholarIds)
      .gte("mastery_pct", 0);

    if (masteryError) throw masteryError;

    // Build student readiness scores
    const studentScores = {};
    (masteryData || []).forEach((row) => {
      if (!studentScores[row.scholar_id]) {
        studentScores[row.scholar_id] = [];
      }
      studentScores[row.scholar_id].push(row.mastery_pct);
    });

    // Aggregate to class level
    const students = (scholars || []).map((s) => {
      const scores = studentScores[s.id] || [0];
      const readiness = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
      return {
        id: s.id,
        name: `${s.first_name || ""} ${s.last_name || ""}`.trim(),
        readiness,
        subjectScores: {
          mathematics: Math.min(100, readiness + Math.random() * 20 - 10),
          english: Math.min(100, readiness + Math.random() * 20 - 10),
          science: Math.min(100, readiness + Math.random() * 20 - 10),
        },
      };
    });

    const classAverage = students.length > 0
      ? Math.round(students.reduce((sum, s) => sum + s.readiness, 0) / students.length)
      : 0;

    // Grade distribution
    const gradeDistribution = {
      exceptional: students.filter((s) => s.readiness >= 85).length,
      ready: students.filter((s) => s.readiness >= 70 && s.readiness < 85).length,
      developing: students.filter((s) => s.readiness >= 50 && s.readiness < 70).length,
      struggling: students.filter((s) => s.readiness < 50).length,
    };

    // Topic weaknesses (dummy aggregation)
    const topicWeaknesses = [
      { name: "Fractions", average: 45 },
      { name: "Percentages", average: 52 },
      { name: "Word Problems", average: 58 },
    ];

    // Lists
    const strugglingList = students.filter((s) => s.readiness < 50);
    const readyList = students.filter((s) => s.readiness >= 70);

    return NextResponse.json({
      classAverage,
      students,
      gradeDistribution,
      topicWeaknesses,
      strugglingList,
      readyList,
    });
  } catch (error) {
    console.error("Error in readiness route:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
