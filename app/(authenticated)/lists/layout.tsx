import { Metadata } from "next";
import { createClient } from "@/utils/supabase/server";
import { ListsSidebarClient } from "@/features/user-lists/components/ListsSidebarClient";
import type { UserList, UserListSummaryRaw } from "@/features/user-lists/types";
import { normalizeUserList } from "@/features/user-lists/types";

export const metadata: Metadata = {
  title: "My Lists | AI Matrx",
  description: "Manage your named collections and choice lists",
};

async function getSidebarLists(): Promise<UserList[]> {
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
    return ((data as UserListSummaryRaw[]) ?? []).map(normalizeUserList);
  } catch {
    return [];
  }
}

export default async function ListsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const lists = await getSidebarLists();

  return (
    <div className="h-page flex flex-col bg-textured overflow-hidden">
      <div className="flex-1 flex min-h-0">
        {/* Left panel — sidebar (hidden on mobile) */}
        <aside className="hidden md:flex flex-shrink-0">
          {/* activeListId resolved client-side from pathname */}
          <ListsSidebarClient lists={lists} activeListId={null} />
        </aside>

        {/* Right panel — page content */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
