"use client";

// AdminSidebarSection — the admin GATE for the admin block in the desktop sidebar footer.
//
// Lives in the footer (outside the route-flipping nav) so it stays visible on
// every route, including ones with a route-specific menu (e.g. /chat).
//
// THE EARLY BOOLEAN (Arman, 2026-10-15): "The admin parts absolutely must not
// ever go past an early boolean check for any non-admin user." This file reads
// the admin boolean and nothing else; the block itself (every admin toggle and
// its effects) is AdminSidebarSectionImpl behind the ONE dynamic edge below, so
// a non-admin downloads none of it. The server Sidebar renders this gate; a
// server-side condition there would not keep the client reference out of the
// chunk, so the boundary lives here.
//
// No layout shift for admins: the footer's pre-paint reserve (admin-footer-reserve.ts)
// holds the block's last height while the chunk loads.

import dynamic from "next/dynamic";
import { useEffect } from "react";
import { ADMIN_FOOTER_ATTR, rememberAdminFooterHeight } from "./admin-footer-reserve";
import { useIsMounted } from "@ai-matrx/kit/hooks";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectAuthReady, selectIsAdminPerson } from "@/lib/redux/selectors/userSelectors";

const AdminSidebarSectionImpl = dynamic(() => import("./AdminSidebarSectionImpl"), {
  ssr: false,
  loading: () => null,
});

export default function AdminSidebarSection() {
  // ADMIN IDENTITY: this section is the way INTO the admin section, so it
  // shows on user pages too. Every tool inside it gates itself on admin
  // POWER and is absent outside /administration (utils/supabase/adminLane.ts).
  const isAdmin = useAppSelector(selectIsAdminPerson);
  const authReady = useAppSelector(selectAuthReady);
  const hydrated = useIsMounted();

  // A person who turns out not to be an admin drops the footer reserve; the next load draws no gap.
  useEffect(() => {
    if (authReady && !isAdmin) rememberAdminFooterHeight(null);
  }, [authReady, isAdmin]);

  // Marks the sidebar the moment the admin boolean is known (not when the Impl chunk
  // mounts), so an open domain panel gives the footer its full width with labels at
  // once (styles/shell.css § THE DOMAIN PANEL) and the panel width never jumps.
  useEffect(() => {
    if (!isAdmin) return undefined;
    const sidebar = document.querySelector<HTMLElement>(".shell-sidebar");
    if (!sidebar) return undefined;
    sidebar.setAttribute(ADMIN_FOOTER_ATTR, "");
    return () => sidebar.removeAttribute(ADMIN_FOOTER_ATTR);
  }, [isAdmin]);

  if (!hydrated || !isAdmin) return null;
  return <AdminSidebarSectionImpl />;
}
