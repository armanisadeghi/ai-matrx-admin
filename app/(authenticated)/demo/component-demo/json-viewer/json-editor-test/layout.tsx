import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo", {
  titlePrefix: "JSON Editor Test",
  title: "Demo",
  description: "JSON editor test demo.",
  letter: "JE", // JSON Editor Test
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
