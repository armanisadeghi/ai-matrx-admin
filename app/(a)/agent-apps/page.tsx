import { createClient } from "@/utils/supabase/server";
import { AgentAppsListClient } from "./AgentAppsListClient";
import type { AgentApp } from "@/features/agent-apps/types";

export default async function AgentAppsListPage() {
  const supabase = (await createClient()) as unknown as {
    from: (table: string) => {
      select: (columns: string) => {
        order: (
          column: string,
          opts: { ascending: boolean },
        ) => Promise<{ data: unknown }>;
      };
    };
  };

  // RLS scopes the result to the user's own apps + org/public visibility.
  const { data: apps } = await supabase
    .from("aga_apps")
    .select("*")
    .order("updated_at", { ascending: false });

  return <AgentAppsListClient apps={(apps as AgentApp[] | null) ?? []} />;
}
