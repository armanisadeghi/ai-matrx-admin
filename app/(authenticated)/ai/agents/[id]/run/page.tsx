import { createClient } from "@/utils/supabase/server";
import { Card } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { Metadata } from "next";
import { AgentRunPage } from "@/features/agents/components/run/AgentRunPage";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("agents")
    .select("name, description")
    .eq("id", id)
    .single();
  return {
    title: data?.name ? `Run ${data.name}` : "Run Agent",
    description: data?.description ?? "Execute your AI agent.",
  };
}

export default async function RunAgentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("agents")
    .select("id, name")
    .eq("id", id)
    .single();

  if (error || !data) {
    return (
      <div className="h-full w-full flex items-center justify-center p-8">
        <Card className="max-w-md w-full p-8 bg-textured border-destructive/30">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="p-3 bg-destructive/10 rounded-full">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <div>
              <h2 className="text-xl font-semibold mb-2">Agent Not Found</h2>
              <p className="text-muted-foreground">
                This agent doesn&apos;t exist or you don&apos;t have access to
                it.
              </p>
            </div>
            <Link href="/ai/agents">
              <Button>Back to Agents</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-[calc(100dvh-var(--header-height))] flex flex-col overflow-hidden">
      <AgentRunPage agentId={id} agentName={data.name ?? "Agent"} />
    </div>
  );
}
