import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo", {
  titlePrefix: "Auto-Grow Textarea",
  title: "Demo",
  description: "Auto-growing textarea demo.",
  letter: "AG", // Auto-Grow Textarea
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
