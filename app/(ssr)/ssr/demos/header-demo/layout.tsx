// app/(ssr)/ssr/header-demo/layout.tsx
// Imports the header-variants CSS once for the entire demo route.

import "@/features/shell/components/header/variants/header-variants.css";

export default function HeaderDemoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
