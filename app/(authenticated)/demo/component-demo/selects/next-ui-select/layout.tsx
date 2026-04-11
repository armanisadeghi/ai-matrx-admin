import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo", {
  titlePrefix: "Next UI Select",
  title: "Demo",
  description: "Next UI select demo.",
  letter: "NS", // Next UI Select
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
