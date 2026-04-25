import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo", {
  titlePrefix: "Loading Button",
  title: "Demo",
  description: "Loading button component demo.",
  letter: "LB", // Loading Button
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
