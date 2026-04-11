import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo", {
  titlePrefix: "Component Demo",
  title: "Demo",
  description: "Browse interactive UI component demonstrations.",
  letter: "CM", // Component demo hub
});

export default function ComponentDemoRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
