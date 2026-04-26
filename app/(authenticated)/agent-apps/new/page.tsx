import { createClient } from "@/utils/supabase/server";
import { CreateAgentAppFormWrapper } from "@/features/agent-apps/components/CreateAgentAppFormWrapper";

interface NewAgentAppPageProps {
  searchParams: Promise<{ agent_id?: string }>;
}

export default async function NewAgentAppPage({
  searchParams,
}: NewAgentAppPageProps) {
  const supabase = (await createClient()) as unknown as {
    auth: { getUser: () => Promise<{ data: { user: { id: string } | null } }> };
    from: (table: string) => {
      select: (columns: string) => {
        order: (
          column: string,
          opts: { ascending: boolean },
        ) => Promise<{ data: unknown }>;
      };
    };
  };

  const params = await searchParams;
  const preselectedAgentId = params.agent_id ?? null;

  const { data: { user } } = await supabase.auth.getUser();

  // Full agent rows so AutoCreate can feed `variable_definitions` to the
  // generator. RLS scopes to user-visible agents.
  const { data: rawAgents } = await supabase
    .from("agx_agent")
    .select("*")
    .order("updated_at", { ascending: false });

  const agents = ((rawAgents as Array<Record<string, unknown>> | null) ?? [])
    .filter((a) => !a.is_archived);

  const { data: categories } = await supabase
    .from("aga_categories")
    .select("*")
    .order("sort_order", { ascending: true });

  const preselectedAgent = preselectedAgentId
    ? agents.find((a) => a.id === preselectedAgentId)
    : undefined;

  // The auth call above guards against an unauthenticated session (RLS would
  // also short-circuit, but reading user.id surfaces it earlier).
  void user;

  return (
    <div className="h-full flex flex-col overflow-hidden bg-textured">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <CreateAgentAppFormWrapper
            agents={agents}
            categories={(categories as unknown[]) ?? []}
            preselectedAgentId={preselectedAgentId}
            preselectedAgent={preselectedAgent}
          />
        </div>
      </div>
    </div>
  );
}
