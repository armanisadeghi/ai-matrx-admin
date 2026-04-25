import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo", {
  titlePrefix: "Code Block Tests",
  title: "Demo",
  description: "Code block rendering and tests demo.",
  letter: "Bk", // Code Block Tests
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
