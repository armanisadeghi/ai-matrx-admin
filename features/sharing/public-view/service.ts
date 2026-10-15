// features/sharing/public-view/service.ts — THE SERVER'S ONE REACH INTO `custom.published_view_read`.
//
// SERVER ONLY. The visitor of a public view holds no session, and the read door takes an address, so
// it is called here with the service role and nowhere else (its door row says `server_only`). The
// decision is the store's: `iam.resolve_publish_binding_kind` (active binding, world lane). This module
// adds no access of its own.
//
// TWO DOORS, ONE READING (lane VIEW-LINK): a published ADDRESS goes through `published_view_read`; a
// shared-by-link TOKEN (64 lower-case hex characters, minted by `public.create_share_link` on a saved
// view) goes through `shared_view_read`. Both end in the same body, so a link shows exactly what the
// published page would: the view's own filter, only its shown fields, at most 500 rows.

import { cache } from "react";
import { storeDoors } from "@ai-matrx/records/core";

import { createAdminClient } from "@/utils/supabase/adminClient";

import type { PublishedView } from "./types";

/** The shape `iam.publish_binding_create` accepts: 3 to 64 lower-case letters, digits and hyphens. */
export const PUBLIC_ADDRESS_SHAPE = /^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$/;

/** The shape of a share-link token: `public.create_share_link` mints two uuids with the dashes removed. */
export const SHARE_TOKEN_SHAPE = /^[0-9a-f]{64}$/;

/**
 * `password` / `unlock` only matter for a password-protected share link: the password a visitor typed, or the fingerprint
 * carried by the signed unlock cookie. The store checks them (`custom.shared_view_read`); nothing here decides.
 */
export const publishedView = cache(async (slug: string, password?: string, unlock?: string): Promise<PublishedView> => {
  if (!PUBLIC_ADDRESS_SHAPE.test(slug)) return null;
  if (SHARE_TOKEN_SHAPE.test(slug)) {
    const { data, error } = await storeDoors(createAdminClient()).rpc("shared_view_read", {
      p_token: slug,
      p_password: password ?? null,
      p_unlock: unlock ?? null,
    });
    if (error) {
      throw new Error(`custom.shared_view_read refused: ${error.message}`);
    }
    // A token is never an address (an address is claimed by a person, a token is minted by the store), so a
    // token the link door does not know is the 404, not a second try at the published door.
    return (data as PublishedView | null) ?? null;
  }
  const { data, error } = await storeDoors(createAdminClient()).rpc("published_view_read", { p_slug: slug });
  if (error) {
    // NOTHING FAILS SILENTLY: a door that refused is not an absent address — a 404 would tell a
    // stranger the link is wrong when it is ours that is.
    throw new Error(`custom.published_view_read refused: ${error.message}`);
  }
  return (data as PublishedView | null) ?? null;
});
