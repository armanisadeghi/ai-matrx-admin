import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo", {
  titlePrefix: "Floating Sheet",
  title: "Demo",
  description: "Floating sheet component demo.",
  letter: "FS", // Floating Sheet
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
