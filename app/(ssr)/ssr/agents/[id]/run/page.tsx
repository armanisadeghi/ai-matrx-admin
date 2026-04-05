import type { Metadata } from "next";
import { createClient } from "@/utils/supabase/server";
import { AgentRunWrapper } from "@/features/agents/components/shared/AgentRunWrapper";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("agx_agent")
    .select("name")
    .eq("id", id)
    .single();
  return {
    title: data?.name ? `Run ${data.name}` : "Run Agent",
  };
}

export default function RunAgentPage() {
  return <AgentRunWrapper />;
}
