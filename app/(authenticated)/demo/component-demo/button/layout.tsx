import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo", {
  titlePrefix: "Button",
  title: "Demo",
  description: "Button component demo.",
  letter: "Bu", // Button
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
