"use client";

import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import type { Database } from "@/types/database.types";
import type { VariableDefinition } from "@/features/agents/types/agent-definition.types";

type AgentInsert = Database["public"]["Tables"]["agx_agent"]["Insert"];

export interface AgentBuilderConfig {
  name: string;
  description?: string;
  systemMessage: string;
  userMessage?: string;
  variableDefaults?: VariableDefinition[];
  settings?: Record<string, unknown>;
}

export interface AgentBuilderResult {
  success: boolean;
  agentId?: string;
  error?: string;
}

const DEFAULT_MODEL_ID = "e2150d2f-7dd3-4fad-9d81-6e6ea41d4afd";

function configToInsertPayload(
  config: AgentBuilderConfig,
): Omit<
  AgentInsert,
  "id" | "created_at" | "updated_at" | "source_agent_id" | "source_snapshot_at"
> {
  const messages = [
    {
      role: "system" as const,
      content: [{ type: "text", text: config.systemMessage.trim() }],
    },
    ...(config.userMessage?.trim()
      ? [
          {
            role: "user" as const,
            content: [{ type: "text", text: config.userMessage.trim() }],
          },
        ]
      : []),
  ];

  const variableDefinitions = (config.variableDefaults ?? []).map((v) => ({
    name: v.name,
    required: v.required ?? false,
    defaultValue: v.defaultValue ?? "",
    ...(v.helpText ? { helpText: v.helpText } : {}),
    ...(v.customComponent ? { customComponent: v.customComponent } : {}),
  }));

  return {
    name: config.name.trim(),
    description: config.description?.trim() ?? null,
    agent_type: "user",
    model_id: DEFAULT_MODEL_ID,
    messages: messages as unknown as AgentInsert["messages"],
    variable_definitions: variableDefinitions.length
      ? (variableDefinitions as unknown as AgentInsert["variable_definitions"])
      : null,
    settings: (config.settings as AgentInsert["settings"]) ?? null,
    tools: [],
    tags: [],
    is_active: true,
    is_public: false,
    is_archived: false,
    is_favorite: false,
    category: null,
    context_slots: null,
    model_tiers: null,
    output_schema: null,
    custom_tools: null,
    mcp_servers: [],
  };
}

export async function createAgentFromBuilder(
  config: AgentBuilderConfig,
): Promise<AgentBuilderResult> {
  try {
    if (!config.name?.trim()) {
      toast.error("Please enter a name for your agent");
      return { success: false, error: "Name is required" };
    }
    if (!config.systemMessage?.trim()) {
      toast.error("System message cannot be empty");
      return { success: false, error: "System message is required" };
    }

    const supabase = createClient();
    const { data, error: insertError } = await supabase
      .from("agx_agent")
      .insert(configToInsertPayload(config))
      .select("id")
      .single();

    if (insertError) {
      console.error("Agent insert error:", insertError);
      toast.error("Failed to create agent", {
        description: insertError.message,
      });
      return { success: false, error: insertError.message };
    }

    toast.success("Agent created!", { description: "Opening the builder..." });
    return { success: true, agentId: data.id };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("Error creating agent:", error);
    toast.error("Failed to create agent", { description: msg });
    return { success: false, error: msg };
  }
}

export function useAgentBuilder(onComplete?: () => void) {
  const router = useRouter();

  return {
    createAgent: async (config: AgentBuilderConfig) => {
      const result = await createAgentFromBuilder(config);
      if (result.success && result.agentId) {
        onComplete?.();
        router.push(`/agents/${result.agentId}/build`);
        router.refresh();
      }
      return result;
    },
  };
}
