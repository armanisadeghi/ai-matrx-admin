import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo", {
  titlePrefix: "Loading Button 2",
  title: "Demo",
  description: "Loading button variant 2 demo.",
  letter: "L2", // Loading Button 2
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
