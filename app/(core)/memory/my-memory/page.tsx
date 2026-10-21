// /memory/my-memory — your memory files (users.user_memory). A guest gets the Knowledge
// landing, like /memory: the table answers a signed-out request with "permission denied".
import KnowledgeLanding from "@/features/auth/components/module-landing/landings/KnowledgeLanding";
import { MyMemoryPage } from "@/features/memory/pages/MyMemoryPage";
import { getSessionVerdict } from "@/utils/supabase/sessionVerdict";

export default async function MemoryMyMemoryRoute() {
  const { isAuthenticated } = await getSessionVerdict();
  if (!isAuthenticated) return <KnowledgeLanding />;
  return <MyMemoryPage />;
}
