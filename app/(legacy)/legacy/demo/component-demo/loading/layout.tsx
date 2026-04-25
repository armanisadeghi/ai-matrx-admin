import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo", {
  titlePrefix: "Loading",
  title: "Demo",
  description: "Loading states component demo.",
  letter: "Ld", // Loading
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
