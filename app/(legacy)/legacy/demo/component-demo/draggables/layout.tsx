import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo", {
  titlePrefix: "Draggables",
  title: "Demo",
  description: "Draggable cards, photos, and container experiments.",
  letter: "Dg", // Draggables index
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
