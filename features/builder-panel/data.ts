/**
 * Builder panel — server data. Direct Supabase reads (RLS: platform admins read every row).
 *
 *  - `mandate.proposal` — PROPOSED mandate and workflow shapes for a surface. A proposal is
 *    data, never a mandate: no holder, not in the declared mandate set until it is built.
 *  - `mandate.definition` — the REAL mandates a surface publishes (by mandate key or by the
 *    provision point key they consume).
 * FEATURE: ./FEATURE.md.
 */
import { supabase } from "@/utils/supabase/client";
import type { Json } from "@/types/database.types";

export interface MandateProposal {
  id: string;
  surfaceKey: string;
  shapeType: "mandate" | "workflow";
  title: string;
  goal: string | null;
  proposedKey: string | null;
  inputs: Json;
  outputKind: string | null;
  outputSketch: Json | null;
  steps: Json;
  status: string;
  notes: string | null;
  updatedAt: string;
}

export async function fetchProposals(surfaceKey: string): Promise<MandateProposal[]> {
  const { data, error } = await supabase
    .schema("mandate")
    .from("proposal")
    .select("id, surface_key, shape_type, title, goal, proposed_key, inputs, output_kind, output_sketch, steps, status, notes, updated_at, sort_order")
    .eq("surface_key", surfaceKey)
    .is("deleted_at", null)
    .order("sort_order", { ascending: true })
    .limit(200);
  if (error) throw new Error(`Proposals could not be read: ${error.message}`);
  return (data ?? []).map((r) => ({
    id: r.id,
    surfaceKey: r.surface_key,
    shapeType: r.shape_type === "workflow" ? "workflow" : "mandate",
    title: r.title,
    goal: r.goal,
    proposedKey: r.proposed_key,
    inputs: r.inputs,
    outputKind: r.output_kind,
    outputSketch: r.output_sketch,
    steps: r.steps,
    status: r.status,
    notes: r.notes,
    updatedAt: r.updated_at,
  }));
}

export interface RealMandate {
  id: string;
  mandateKey: string;
  label: string;
  goal: string | null;
  outputKind: string | null;
  provisionKey: string | null;
  isEnabled: boolean;
}

/** Mandates named by key, or consuming one of the given provision points. */
export async function fetchSurfaceMandates(mandateKeys: string[], provisionKeys: string[]): Promise<RealMandate[]> {
  if (!mandateKeys.length && !provisionKeys.length) return [];
  const ors = [
    mandateKeys.length ? `mandate_key.in.(${mandateKeys.map((k) => `"${k}"`).join(",")})` : null,
    provisionKeys.length ? `provision_key.in.(${provisionKeys.map((k) => `"${k}"`).join(",")})` : null,
  ].filter(Boolean);
  const { data, error } = await supabase
    .schema("mandate")
    .from("definition")
    .select("id, mandate_key, label, goal, output_kind, provision_key, is_enabled")
    .or(ors.join(","))
    .is("deleted_at", null)
    .limit(200);
  if (error) throw new Error(`Mandates could not be read: ${error.message}`);
  return (data ?? []).map((r) => ({
    id: r.id,
    mandateKey: r.mandate_key,
    label: r.label,
    goal: r.goal,
    outputKind: r.output_kind,
    provisionKey: r.provision_key,
    isEnabled: r.is_enabled,
  }));
}
