import { createClient } from "@/lib/supabase/server";
import ParentAnalytics from "./ParentAnalytics";

export default async function Page({ searchParams }) {
  // Next.js 15: searchParams is a Promise and must be awaited
  const params = await searchParams;
  const scholarId = params?.scholar;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <ParentAnalytics scholar={null} results={[]} />;
  }

  // Guard: if no scholarId in URL, show empty state
  if (!scholarId) {
    return <ParentAnalytics scholar={null} results={[]} />;
  }

  const { data: scholar } = await supabase
    .from("scholars")
    .select("*")
    .eq("parent_id", user.id)
    .eq("id", scholarId)
    .single();

  // Guard: scholar not found or doesn't belong to this parent
  if (!scholar) {
    return <ParentAnalytics scholar={null} results={[]} />;
  }

  const { data: results } = await supabase
    .from("quiz_results")
    .select("*")
    .eq("scholar_id", scholar.id)
    .order("created_at", { ascending: true }); // was completed_at — column is created_at

  return (
    <ParentAnalytics
      scholar={scholar}
      results={results || []}
    />
  );
}