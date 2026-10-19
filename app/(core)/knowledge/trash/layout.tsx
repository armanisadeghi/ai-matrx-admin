import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/knowledge/trash", {
  titlePrefix: "Trash",
  title: "Knowledge",
  description: "Restore trashed library documents.",
  letter: "KT",
});

export default function KnowledgeTrashLayout({ children }: { children: React.ReactNode }) {
  return children;
}
