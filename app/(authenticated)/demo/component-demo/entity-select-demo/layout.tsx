import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo", {
  titlePrefix: "Entity Select",
  title: "Demo",
  description: "Entity select component demo.",
  letter: "ES", // Entity Select
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
