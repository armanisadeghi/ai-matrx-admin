// app/(ssr)/ssr/header-demo/page.tsx
// Server shell — hands off to the client demo component.

import HeaderDemoClient from "../_components/HeaderDemoClient";

export default function HeaderDemoPage() {
  return <HeaderDemoClient />;
}
