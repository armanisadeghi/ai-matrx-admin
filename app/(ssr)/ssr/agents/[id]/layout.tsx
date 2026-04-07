import { createClient } from "@/utils/supabase/server";
import { Card } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { serverToolsService } from "@/utils/supabase/server-tools-service";
import { AgentPageProvider } from "@/features/agents/components/shared/AgentPageContext";
import { AgentSharedHeader } from "@/features/agents/components/shared/AgentSharedHeader";
import PageHeader from "@/features/shell/components/header/PageHeader";
import type { DatabaseTool } from "@/utils/supabase/tools-service";

export const revalidate = 43200;

export default async function AgentIdLayout({
  params,
  children,
}: {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("agx_agent")
    .select("id, name, description")
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
            <Link href="/ssr/agents">
              <Button>Back to Agents</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <AgentPageProvider
      agentId={id}
      agentName={data.name ?? "Agent"}
    >
      <PageHeader>
        <AgentSharedHeader />
      </PageHeader>
      <div
        className="h-full flex flex-col overflow-hidden"
        style={{ paddingTop: "var(--shell-header-h)" }}
      >
        {children}
      </div>
    </AgentPageProvider>
  );
}
