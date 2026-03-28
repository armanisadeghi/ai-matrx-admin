// app/(ssr)/ssr/header-demo/layout.tsx
// Imports the header-variants CSS once for the entire demo route.

import "@/features/ssr-trials/components/header-variants/header-variants.css";

export const metadata = {
  title: "Header Variants | AI Matrx",
  description: "Live demo of all header center-zone variants",
};

export default function HeaderDemoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
