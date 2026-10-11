import { UserManagerService } from "@univerjs/core";
import { supabase } from "@/utils/supabase/client";
import { getClaimsUser } from "@/utils/supabase/claimsUser";

type InjectorLike = { get(id: unknown): unknown };

/**
 * Tell Univer who is typing, so a comment thread is attributed to the
 * signed-in person instead of Univer's placeholder owner.
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
  users.setCurrentUser({ userID: user.id, name, avatar: String(meta.avatar_url ?? "") });
}
