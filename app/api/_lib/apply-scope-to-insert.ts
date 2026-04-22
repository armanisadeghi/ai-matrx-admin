import { NextResponse } from "next/server";

/**
 * Resolves `scope` + `scopeId` from a JSON request body into the four row-level
 * scope foreign keys (`user_id`, `organization_id`, `project_id`, `task_id`)
 * used across the agent-shortcuts / shortcut-categories / content-blocks
 * tables.
 *
 * The authenticated `userId` is used for `scope === "user"` so the client never
 * needs to send it (and can't spoof it). For scoped inserts (organization /
 * project / task), `scopeId` on the body must be a non-empty string.
 *
 * Returns either a mutated `payload` with the correct FK set, or a
 * `NextResponse` with a 400 if the scope is malformed.
 */
export function applyScopeToInsertPayload(args: {
  body: Record<string, unknown>;
  payload: Record<string, unknown>;
  userId: string;
}): NextResponse | Record<string, unknown> {
  const { body, payload, userId } = args;
  const scope = typeof body.scope === "string" ? body.scope : null;
  const scopeId =
    typeof body.scopeId === "string" && body.scopeId.length > 0
      ? body.scopeId
      : null;

  // Always normalize so clients cannot inject a scope FK out of band.
  payload.user_id = null;
  payload.organization_id = null;
  payload.project_id = null;
  payload.task_id = null;

  if (scope === null || scope === "global") {
    return payload;
  }

  if (scope === "user") {
    payload.user_id = userId;
    return payload;
  }

  if (scope === "organization" || scope === "project" || scope === "task") {
    if (!scopeId) {
      return NextResponse.json(
        { error: `scopeId is required when scope=${scope}` },
        { status: 400 },
      );
    }
    if (scope === "organization") payload.organization_id = scopeId;
    else if (scope === "project") payload.project_id = scopeId;
    else payload.task_id = scopeId;
    return payload;
  }

  return NextResponse.json(
    { error: `Unknown scope: ${scope}` },
    { status: 400 },
  );
}
