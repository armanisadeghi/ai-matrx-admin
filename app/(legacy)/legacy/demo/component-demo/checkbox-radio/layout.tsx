import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo", {
  titlePrefix: "Checkbox & Radio",
  title: "Demo",
  description: "Checkbox and radio component demo.",
  letter: "Xr", // Checkbox & Radio (distinct from services Callback Manager "Cb")
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
