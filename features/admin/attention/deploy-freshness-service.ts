import { createClient } from "@/utils/supabase/client";
import type { DeployFreshnessRow } from "./sources/deploy-freshness";

/** Every service the Ship Manager reports behind its release or unhealthy, and the watch's own silence. */
export async function fetchDeployFreshness(): Promise<DeployFreshnessRow[]> {
  const { data, error } = await createClient().schema("platform").rpc("deploy_freshness_for_attention");
  if (error) throw new Error(error.message);
  return data ?? [];
}
