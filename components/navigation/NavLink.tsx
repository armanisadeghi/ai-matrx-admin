"use client";

/**
 * NavLink — THE LINK for navigation chrome (sidebars, flyouts, drawers, headers,
 * module sub-navs) where dozens of links render on every page.
 *
 * Same as `AppLink` (so cross-deployment hrefs still work) except `prefetch`
 * defaults to `false`: Next then skips the viewport prefetch (one RSC request per
 * visible link per page load) but still prefetches on hover/focus/touch, so
 * navigation stays instant. Pass `prefetch` explicitly to override.
 *
 * Guard: `pnpm check:nav-link-prefetch` fails on a bare Link/AppLink in the shell.
 */

import { forwardRef, type ComponentPropsWithoutRef } from "react";
import AppLink from "@/components/navigation/AppLink";

type NavLinkProps = ComponentPropsWithoutRef<typeof AppLink>;

const NavLink = forwardRef<HTMLAnchorElement, NavLinkProps>(function NavLink(
  { prefetch = false, ...rest },
  ref,
) {
  return <AppLink {...rest} ref={ref} prefetch={prefetch} />;
});

export default NavLink;
export { NavLink };
