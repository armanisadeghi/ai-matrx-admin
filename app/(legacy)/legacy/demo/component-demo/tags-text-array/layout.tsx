import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo", {
  titlePrefix: "Tags Text Array",
  title: "Demo",
  description: "Tags and text array demo.",
  letter: "Ta", // Tags Text Array
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
