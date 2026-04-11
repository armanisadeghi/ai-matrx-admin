import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo", {
  titlePrefix: "AI Prog Basic",
  title: "Demo",
  description: "Basic AI programming demo.",
  letter: "Bc", // AI Prog Basic
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
