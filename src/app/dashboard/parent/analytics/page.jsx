import { createClient } from "@/lib/supabase/server";
import ParentAnalytics from "./ParentAnalytics";

export default async function Page({ searchParams }) {
  // Next.js 15+: searchParams is a Promise and must be awaited
  const params = await searchParams;
  const scholarId = params?.scholar;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <ParentAnalytics scholar={null} scholars={[]} results={[]} />;
  }

  // Fetch ALL scholars for this parent (for the scholar picker)
  const { data: allScholars } = await supabase
    .from("scholars")
    .select("*")
    .eq("parent_id", user.id)
    .is("archived_at", null)
    .order("created_at", { ascending: true });

  const scholars = allScholars || [];

  // If no scholars at all, show empty state
  if (scholars.length === 0) {
    return <ParentAnalytics scholar={null} scholars={[]} results={[]} />;
  }

  // Resolve which scholar to show:
  // 1. If ?scholar=<id> is provided, use that
  // 2. Otherwise, auto-select the first scholar
  let scholar = null;

  if (scholarId) {
    scholar = scholars.find((s) => s.id === scholarId) || null;
  }

  // Fallback: auto-select first scholar if no valid ID provided
  if (!scholar) {
    scholar = scholars[0];
  }

  // Fetch quiz results for the selected scholar
  const { data: results } = await supabase
    .from("quiz_results")
    .select("*")
    .eq("scholar_id", scholar.id)
    .order("created_at", { ascending: true });

  return (
    <ParentAnalytics
      scholar={scholar}
      scholars={scholars}
      results={results || []}
    />
  );
}
