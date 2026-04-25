import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo", {
  titlePrefix: "Accordion",
  title: "Demo",
  description: "Interactive accordion component demo.",
  letter: "Ac", // Accordion
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
