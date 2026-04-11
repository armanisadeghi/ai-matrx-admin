"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import type { AgentDefinition } from "@/features/agents/types/agent-definition.types";
import type { Database } from "@/types/database.types";

type AgentInsert = Omit<
  Database["public"]["Tables"]["agx_agent"]["Insert"],
  "id" | "created_at" | "updated_at" | "source_agent_id" | "source_snapshot_at"
>;

function seedToInsertPayload(
  seed: Omit<Partial<AgentDefinition>, "id">,
): AgentInsert {
  return {
    name: seed.name ?? "Untitled Agent",
    description: seed.description ?? null,
    category: seed.category ?? null,
    tags: seed.tags ?? [],
    is_active: seed.isActive ?? true,
    is_public: seed.isPublic ?? false,
    is_archived: seed.isArchived ?? false,
    is_favorite: seed.isFavorite ?? false,
    agent_type: seed.agentType ?? "user",
    model_id: seed.modelId ?? null,
    messages:
      (seed.messages as unknown as AgentInsert["messages"]) ?? null,
    variable_definitions:
      (seed.variableDefinitions as unknown as AgentInsert["variable_definitions"]) ?? null,
    settings:
      (seed.settings as unknown as AgentInsert["settings"]) ?? null,
    tools: seed.tools ?? [],
    context_slots:
      (seed.contextSlots as unknown as AgentInsert["context_slots"]) ?? null,
    model_tiers:
      (seed.modelTiers as unknown as AgentInsert["model_tiers"]) ?? null,
    output_schema:
      (seed.outputSchema as unknown as AgentInsert["output_schema"]) ?? null,
    custom_tools:
      (seed.customTools as unknown as AgentInsert["custom_tools"]) ?? null,
    mcp_servers: seed.mcpServers ?? [],
  };
}

/**
 * Creates an agent from a seed (template constant) and redirects to the builder.
 * Runs entirely on the server — the DB INSERT sets user_id via RLS default.
 */
export async function createAgentFromSeed(
  seed: Omit<Partial<AgentDefinition>, "id">,
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("agx_agent")
    .insert(seedToInsertPayload(seed))
    .select("id")
    .single();

  if (error) throw error;
  redirect(`/agents/${data.id}/build`);
}
