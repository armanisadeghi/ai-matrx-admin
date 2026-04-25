import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo", {
  titlePrefix: "Markdown Flow",
  title: "Demo",
  description: "Convert markdown into flow diagrams.",
  letter: "MF", // Markdown to flow
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
