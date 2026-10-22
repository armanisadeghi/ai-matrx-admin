// /demos/page-top-sharp — the ui-sharp entry in the page-top bake-off (path row, tabs row,
// intro band, numbers band) on a real brand. See PageTopSharpDemo.tsx.
import { Suspense } from "react";
import { PageTopSharpDemo } from "./PageTopSharpDemo";

export default function PageTopSharpPage() {
  return (
    <Suspense fallback={null}>
      <PageTopSharpDemo />
    </Suspense>
  );
}
