import type { Json } from "@/types/database.types";
import type {
  ArgumentMapping,
  ArgumentOverride,
  WorkflowDependency,
} from "@/features/workflows/types/functionNodeTypes";
import type { NodeDefinitionType } from "@/features/workflows/react-flow/node-editor/workflow-node-editor/custom-workflow-nodes/custom-nodes/custom-node-definitions";
import type { Viewport } from "reactflow";

export function parseWorkflowViewport(
  raw: Json | null | undefined,
): Viewport | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const x = o.x;
  const y = o.y;
  const zoom = o.zoom;
  if (
    typeof x !== "number" ||
    typeof y !== "number" ||
    typeof zoom !== "number"
  ) {
    return null;
  }
  return { x, y, zoom };
}

export function asStringArray(raw: Json | null | undefined): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((item): item is string => typeof item === "string");
}

function isArgumentOverride(item: unknown): item is ArgumentOverride {
  if (!item || typeof item !== "object" || Array.isArray(item)) return false;
  const o = item as Record<string, unknown>;
  return (
    typeof o.name === "string" &&
    typeof o.ready === "boolean" &&
    typeof o.required === "boolean"
  );
}

export function asArgumentOverrides(
  raw: Json | null | undefined,
): ArgumentOverride[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(isArgumentOverride);
}

function isArgumentMapping(item: unknown): item is ArgumentMapping {
  if (!item || typeof item !== "object" || Array.isArray(item)) return false;
  const o = item as Record<string, unknown>;
  return (
    typeof o.source_broker_id === "string" &&
    typeof o.target_arg_name === "string"
  );
}

export function asArgumentMappings(
  raw: Json | null | undefined,
): ArgumentMapping[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(isArgumentMapping);
}

function isWorkflowDependency(item: unknown): item is WorkflowDependency {
  if (!item || typeof item !== "object" || Array.isArray(item)) return false;
  const o = item as Record<string, unknown>;
  return typeof o.source_broker_id === "string";
}

export function asWorkflowDependencies(
  raw: Json | null | undefined,
): WorkflowDependency[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(isWorkflowDependency);
}

/** Plain object for spreading workflow_node.metadata JSON. */
export function asMetadataRecord(
  raw: Json | null | undefined,
): Record<string, unknown> {
  if (raw === null || raw === undefined) return {};
  if (typeof raw !== "object" || Array.isArray(raw)) return {};
  return { ...(raw as Record<string, unknown>) };
}

export function asNodeDefinitionFromMetadata(
  raw: Json | null | undefined,
): NodeDefinitionType | undefined {
  const rec = asMetadataRecord(raw);
  const value = rec.nodeDefinition;
  if (!value || typeof value !== "object" || Array.isArray(value))
    return undefined;
  const o = value as Record<string, unknown>;
  if (typeof o.dynamic_broker_arg !== "string") return undefined;
  if (!Array.isArray(o.predefined_brokers)) return undefined;
  return value as NodeDefinitionType;
}
