import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo", {
  titlePrefix: "Container Drop",
  title: "Demo",
  description: "Container drop drag-and-drop demo.",
  letter: "DC", // Container Drop
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
