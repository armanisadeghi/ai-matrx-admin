import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo", {
  titlePrefix: "Code Editor v3",
  title: "Demo",
  description: "AI code editor v3 component demo.",
  letter: "E3", // Code Editor v3
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
