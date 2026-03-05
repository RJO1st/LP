import ParentAnalytics from "./ParentAnalytics";

export default function Page({ searchParams }) {
  return <ParentAnalytics scholarId={searchParams.scholar} />;
}