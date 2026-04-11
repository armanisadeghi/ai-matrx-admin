import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo", {
  titlePrefix: "Float Select",
  title: "Demo",
  description: "Floating label select demo.",
  letter: "SF", // Float Select
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
