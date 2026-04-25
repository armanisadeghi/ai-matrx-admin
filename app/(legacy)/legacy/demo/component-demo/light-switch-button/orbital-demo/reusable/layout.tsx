import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo", {
  titlePrefix: "Orbital Reusable",
  title: "Demo",
  description: "Reusable orbital light switch demo.",
  letter: "OR", // Orbital Reusable
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
