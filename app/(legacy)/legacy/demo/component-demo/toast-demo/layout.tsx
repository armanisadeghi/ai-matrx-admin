import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo", {
  titlePrefix: "Toast",
  title: "Demo",
  description: "Toast notification demo.",
  letter: "Td", // Toast
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
