import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo", {
  titlePrefix: "Transformable Cards",
  title: "Demo",
  description: "Transformable cards demo.",
  letter: "TF", // Transformable Cards
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
