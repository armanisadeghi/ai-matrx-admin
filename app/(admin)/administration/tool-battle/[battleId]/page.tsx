// record-view: none — an admin support view; the admin seat never edits an organization's fields
import { ToolBattlePage } from "@/features/tool-battle/components/ToolBattlePage";

export const metadata = { title: "Tool Battle | Admin" };

export default async function ToolBattleRoute({ params }: { params: Promise<{ battleId: string }> }) {
  const { battleId } = await params;
  return <ToolBattlePage battleId={battleId} />;
}
