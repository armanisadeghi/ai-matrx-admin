// record-view: none — a retired address that forwards to the one template gallery
// app/(core)/scopes/templates/page.tsx — the scope-template catalog was retired onto the template
// family (lane TEMPLATES, RETIRE-1): every published template, scope templates included, is on
// /make's gallery. An old link lands there. The 308 in next.config.js `redirects()` answers this
// address before any layout renders; this page is only the route-table entry the generated route
// maps read.

import { redirect } from "next/navigation";
import { TEMPLATE_GALLERY_HREF } from "@/features/make/gallery/galleryHref";

export default function ScopesTemplatesPage(): never {
  redirect(TEMPLATE_GALLERY_HREF);
}
