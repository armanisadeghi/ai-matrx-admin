"use server";

import { serverToolsService } from "@/utils/supabase/server-tools-service";

export async function fetchToolsAction() {
  return await serverToolsService.fetchTools();
}
