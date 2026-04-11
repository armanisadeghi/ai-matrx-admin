import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo", {
  titlePrefix: "LS Glass",
  title: "Demo",
  description: "Light switch glass showcase demo.",
  letter: "LG", // LS Glass
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
