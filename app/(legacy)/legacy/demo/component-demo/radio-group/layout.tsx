import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo", {
  titlePrefix: "Radio Group",
  title: "Demo",
  description: "Radio group component demo.",
  letter: "Rg", // Radio Group
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
