import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo", {
  titlePrefix: "Photo Cards",
  title: "Demo",
  description: "Draggable photo cards demo.",
  letter: "PC", // Photo Cards
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
