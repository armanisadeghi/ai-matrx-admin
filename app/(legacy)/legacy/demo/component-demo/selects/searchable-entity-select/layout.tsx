import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo", {
  titlePrefix: "Searchable Select",
  title: "Demo",
  description: "Searchable entity select demo.",
  letter: "SR", // Searchable Select
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
