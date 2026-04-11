import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo", {
  titlePrefix: "Sortable DnD",
  title: "Demo",
  description: "Sortable drag-and-drop demo.",
  letter: "DN", // Sortable DnD
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
