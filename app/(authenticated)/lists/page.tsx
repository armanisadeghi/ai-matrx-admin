import { Metadata } from "next";
import { createClient } from "@/utils/supabase/server";
import { ListsTableView } from "@/features/user-lists/components/ListsTableView";
import type { UserList, UserListSummaryRaw } from "@/features/user-lists/types";
import { normalizeUserList } from "@/features/user-lists/types";

export const metadata: Metadata = {
  title: "My Lists | AI Matrx",
  description: "Manage your named collections and choice lists",
};

async function getLists(): Promise<UserList[]> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase.rpc("get_user_lists_summary", {
      p_user_id: user.id,
    });
    if (error) return [];
    return ((data as unknown as UserListSummaryRaw[]) ?? []).map(
      normalizeUserList,
    ) as UserList[];
  } catch {
    return [];
  }
}

export default async function ListsV2Page() {
  const lists = await getLists();

  return (
    <div className="h-[calc(100vh-2.5rem)] flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <ListsTableView lists={lists} />
      </div>
    </div>
  );
}
