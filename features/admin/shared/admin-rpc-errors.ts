// features/admin/shared/admin-rpc-errors.ts
//
// Shared error interpretation for the super-admin SECURITY DEFINER RPC
// families (admin_update_app_config, admin_upsert_catalog_entry, ...).
// All of them raise 42501 for non-super-admins and PT409 ("Conflict: ...")
// for optimistic-concurrency failures — never 40001, which PostgREST retries
// without limit (2026-10-21 outage; DB guard platform._no_retried_refusal_code).

export interface AdminRpcError {
  code?: string;
  message: string;
}

export function rpcErrorMessage(error: AdminRpcError): string {
  if (error.code === "42501") {
    return "Super Admin required — your account cannot perform this write.";
  }
  return error.message;
}

/** ERRCODE PT409 ("Conflict: …") raised when the row changed since it was
 *  loaded (optimistic-concurrency check on p_expected_updated_at). */
export function isConflictError(error: AdminRpcError): boolean {
  return error.code === "PT409" || error.message.startsWith("Conflict:");
}
