import { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { ListItemsTableView } from "@/features/user-lists/components/ListItemsTableView";
import type { UserList, UserListItem } from "@/features/user-lists/types";

interface PageProps {
  params: Promise<{ id: string }>;
}

async function getListAndItems(
  listId: string,
): Promise<{ list: UserList; items: UserListItem[] } | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const [listResult, itemsResult] = await Promise.all([
      supabase.from("user_lists").select("*").eq("id", listId).single(),
      supabase
        .from("user_list_items")
        .select("*")
        .eq("list_id", listId)
        .order("group_name", { ascending: true })
        .order("label", { ascending: true }),
    ]);

    if (listResult.error || !listResult.data) return null;

    const list: UserList = {
      id: listResult.data.id,
      list_name: listResult.data.list_name,
      description: listResult.data.description,
      user_id: listResult.data.user_id,
      is_public: listResult.data.is_public,
      public_read: listResult.data.public_read,
      created_at: listResult.data.created_at,
      updated_at: listResult.data.updated_at,
    };

    const items: UserListItem[] = (itemsResult.data ?? []) as UserListItem[];

    return { list, items };
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const result = await getListAndItems(id);
  if (!result) return { title: "List Not Found" };
  return {
    title: `${result.list.list_name} | My Lists | AI Matrx`,
    description: result.list.description ?? undefined,
  };
}

export default async function ListDetailPage({ params }: PageProps) {
  const { id } = await params;
  const result = await getListAndItems(id);

  if (!result) notFound();

  return (
    <div className="h-[calc(100vh-2.5rem)] flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <ListItemsTableView list={result.list} items={result.items} />
      </div>
    </div>
  );
}
