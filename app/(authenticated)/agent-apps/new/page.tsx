import { createClient } from "@/utils/supabase/server";
import { NewAgentAppClient } from "./NewAgentAppClient";
import type { AgentOption } from "@/features/agent-apps/components/SearchableAgentSelect";

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

  const { data: { user } } = await supabase.auth.getUser();
  const params = await searchParams;
  const preselectedAgentId = params.agent_id ?? null;

  // RLS scopes the agent list to what the user can see (own + public + org).
  const { data: rawAgents } = await supabase
    .from("agx_agent")
    .select("id, name, description, category, is_public, is_archived")
    .order("updated_at", { ascending: false });

  const agents: AgentOption[] = (
    (rawAgents as
      | Array<{
          id: string;
          name: string;
          description: string | null;
          category: string | null;
          is_public: boolean;
          is_archived: boolean;
        }>
      | null) ?? []
  )
    .filter((a) => !a.is_archived)
    .map((a) => ({
      id: a.id,
      name: a.name,
      description: a.description,
      category: a.category,
      isPublic: a.is_public,
    }));

  return (
    <div className="h-full flex flex-col overflow-hidden bg-textured">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <NewAgentAppClient
            agents={agents}
            preselectedAgentId={preselectedAgentId}
            currentUserId={user?.id ?? null}
          />
        </div>
      </div>
    </div>
  );
}
