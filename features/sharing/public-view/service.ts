// features/sharing/public-view/service.ts — THE SERVER'S ONE REACH INTO `custom.published_view_read`.
//
// SERVER ONLY. The visitor of a public view holds no session, and the read door takes an address, so
// it is called here with the service role and nowhere else (its door row says `server_only`). The
// decision is the store's: `iam.resolve_publish_binding_kind` (active binding, world lane). This module
// adds no access of its own.

import { cache } from "react";
import { storeDoors } from "@ai-matrx/records/core";

import { createAdminClient } from "@/utils/supabase/adminClient";

import type { PublishedView } from "./types";

/** The shape `iam.publish_binding_create` accepts: 3 to 64 lower-case letters, digits and hyphens. */
export const PUBLIC_ADDRESS_SHAPE = /^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$/;

export const publishedView = cache(async (slug: string): Promise<PublishedView> => {
  if (!PUBLIC_ADDRESS_SHAPE.test(slug)) return null;
  const { data, error } = await storeDoors(createAdminClient()).rpc("published_view_read", { p_slug: slug });
  if (error) {
    // NOTHING FAILS SILENTLY: a door that refused is not an absent address — a 404 would tell a
    // stranger the link is wrong when it is ours that is.
    throw new Error(`custom.published_view_read refused: ${error.message}`);
  }
  return (data as PublishedView | null) ?? null;
});
