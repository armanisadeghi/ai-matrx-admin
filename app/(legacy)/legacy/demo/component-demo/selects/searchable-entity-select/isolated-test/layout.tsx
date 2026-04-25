import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo", {
  titlePrefix: "Search Select Iso",
  title: "Demo",
  description: "Isolated searchable entity select test.",
  letter: "SI", // Search Select Iso
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
