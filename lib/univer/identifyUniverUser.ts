import { UserManagerService } from "@univerjs/core";
import { supabase } from "@/utils/supabase/client";
import { getClaimsUser } from "@ai-matrx/auth";

type InjectorLike = { get(id: unknown): unknown };

/**
 * Tell Univer who is typing, so a comment thread is attributed to the
 * signed-in person instead of Univer's placeholder owner.
 *
 * The userID MUST keep the `Owner_` prefix: Univer's built-in local
 * permission service grants unit roles by user-id prefix (`isDevRole`), so a
 * bare uuid gets no role and every edit is refused as "range is protected".
 * Our own access (canActOn) decides editability; Univer must always see an
 * owner. Guarded by identify-univer-user-keeps-owner-role.test.ts.
 */
export async function identifyUniverUser(injector: InjectorLike): Promise<void> {
  const { data } = await getClaimsUser(supabase);
  const user = data?.user;
  if (!user?.id) return;
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const name = String(meta.full_name ?? meta.name ?? user.email ?? "You");
  const users = injector.get(UserManagerService) as {
    setCurrentUser(u: { userID: string; name: string; avatar: string }): void;
  };
  users.setCurrentUser({ userID: univerOwnerId(user.id), name, avatar: String(meta.avatar_url ?? "") });
}

/** Univer's local permission service reads the role from this prefix. */
export function univerOwnerId(userId: string): string {
  return `Owner_${userId}`;
}
