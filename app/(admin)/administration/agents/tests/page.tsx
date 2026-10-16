import { AgentTestsPlatformPage } from "@/features/agent-tests/components/AgentTestsPlatformPage";

export const metadata = { title: "Agent Tests | Admin" };

// Platform-wide agent test runs: pass rate and spend per agent (Agent Evaluation PLAN §7).
export default function AdminAgentTestsPage() {
  return <AgentTestsPlatformPage />;
}
