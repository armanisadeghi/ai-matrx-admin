import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo", {
  titlePrefix: "Interactive Cards",
  title: "Demo",
  description: "Draggable interactive cards demo.",
  letter: "IC", // Interactive Cards
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
