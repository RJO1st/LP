import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { supabaseKeys } from '@/lib/env'

export async function POST(request, { params }) {
  const { schoolId } = params;

  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseKeys.publishable(),
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
        },
      }
    );

    // Parse CSV from request
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    const text = await file.text();
    const lines = text.trim().split("\n");

    if (lines.length < 2) {
      return NextResponse.json(
        { error: "CSV must have header and at least one data row" },
        { status: 400 }
      );
    }

    // Parse CSV
    // Expected format: first_name,last_name,class_name,year_level
    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
    const firstNameIdx = headers.indexOf("first_name");
    const lastNameIdx = headers.indexOf("last_name");
    const classNameIdx = headers.indexOf("class_name");
    const yearLevelIdx = headers.indexOf("year_level");

    if (firstNameIdx === -1 || lastNameIdx === -1 || classNameIdx === -1) {
      return NextResponse.json(
        { error: "CSV must have first_name, last_name, and class_name columns" },
        { status: 400 }
      );
    }

    // Get or create classes
    const classMap = {};

    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(",").map((p) => p.trim());
      const firstName = parts[firstNameIdx] || "";
      const lastName = parts[lastNameIdx] || "";
      const className = parts[classNameIdx] || "";
      const yearLevel = parts[yearLevelIdx] || "1";

      if (!firstName || !lastName || !className) continue;

      // Get or create class
      if (!classMap[className]) {
        const { data: existingClass } = await supabase
          .from("classes")
          .select("id")
          .eq("school_id", schoolId)
          .eq("name", className)
          .limit(1)
          .single();

        if (existingClass) {
          classMap[className] = existingClass.id;
        } else {
          const { data: newClass, error: classError } = await supabase
            .from("classes")
            .insert([
              {
                id: uuidv4(),
                school_id: schoolId,
                name: className,
                year_level: parseInt(yearLevel) || 1,
                curriculum: "ng_primary", // Default to Nigerian Primary
              },
            ])
            .select("id")
            .single();

          if (classError) {
            console.error("Class creation error:", classError);
            continue;
          }
          classMap[className] = newClass.id;
        }
      }

      // Create scholar
      const scholarId = uuidv4();
      const { error: scholarError } = await supabase
        .from("scholars")
        .insert([
          {
            id: scholarId,
            first_name: firstName,
            last_name: lastName,
            curriculum: "ng_primary",
            avatar: {
              base: "astronaut",
              hat: null,
              pet: null,
              accessory: null,
              background: "space",
              skin: "default",
              hair: "default",
              expression: "happy",
            },
          },
        ]);

      if (scholarError && !scholarError.message?.includes("unique")) {
        console.error("Scholar creation error:", scholarError);
        continue;
      }

      // Enrol scholar in class
      const { error: enrolError } = await supabase
        .from("enrolments")
        .insert([
          {
            scholar_id: scholarId,
            class_id: classMap[className],
            academic_year: new Date().getFullYear().toString(),
          },
        ]);

      if (enrolError) {
        console.error("Enrolment error:", enrolError);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Scholars imported successfully`,
    });
  } catch (error) {
    console.error("Error in import route:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
