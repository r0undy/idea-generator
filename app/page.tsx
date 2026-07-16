import PullScreen from "@/components/pull/PullScreen";

/**
 * Pull screen shell (Server Component). Static chrome renders on the
 * server; all interactivity (chest state, pull requests, result reveal)
 * lives in the "use client" PullScreen island. See design.md > "Layering".
 */
export default function Home() {
  return <PullScreen />;
}
