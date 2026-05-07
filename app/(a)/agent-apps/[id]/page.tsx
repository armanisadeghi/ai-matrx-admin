import { createClient } from "@/utils/supabase/server";
import { notFound } from "next/navigation";
import { AgentAppEditPageClient } from "./AgentAppEditPageClient";
import type { AgentApp } from "@/features/agent-apps/types";

interface AgentAppPageProps {
  params: Promise<{ id: string }>;
}

function isUUID(str: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

export default async function AgentAppPage({ params }: AgentAppPageProps) {
  const { id } = await params;
  const supabase = (await createClient()) as unknown as {
    from: (table: string) => {
      select: (columns: string) => {
        eq: (
          column: string,
          value: string,
        ) => {
          single: () => Promise<{ data: AgentApp | null; error: unknown }>;
        };
      };
    };
  };

  const isId = isUUID(id);
  const column = isId ? "id" : "slug";

  const { data: app, error } = await supabase
    .from("aga_apps")
    .select("*")
    .eq(column, id)
    .single();

  if (error || !app) {
    notFound();
  }

  return <AgentAppEditPageClient app={app} />;
}
