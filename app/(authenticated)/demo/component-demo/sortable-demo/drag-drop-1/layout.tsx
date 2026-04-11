import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo", {
  titlePrefix: "Drag Drop 1",
  title: "Demo",
  description: "Drag and drop pattern one demo.",
  letter: "D1", // Drag Drop 1
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
