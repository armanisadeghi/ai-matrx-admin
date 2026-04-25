import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo", {
  titlePrefix: "Enhanced Draggable",
  title: "Demo",
  description: "Enhanced draggable cards demo.",
  letter: "ED", // Enhanced Draggable
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
