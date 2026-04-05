import type { Metadata } from "next";
import { createClient } from "@/utils/supabase/server";
import { AgentBuilderWrapper } from "@/features/agents/components/shared/AgentBuilderWrapper";

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
    title: data?.name ? `${data.name} — Agent Builder` : "Agent Builder",
  };
}

export default function EditAgentPage() {
  return <AgentBuilderWrapper />;
}
