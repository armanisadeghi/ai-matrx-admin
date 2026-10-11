/** Route families that must stop guests before any product data is resolved. */
export function routeRequiresAuthentication(pathname: string): boolean {
  // 🚨 THE CLIENT PORTAL IS THE ONE `/portal/**` ROUTE A GUEST MUST REACH.
  // `/portal/c/<slug>` is a link a business sends to ITS CLIENT, and her signed-out
  // state is the page's whole point: the portal's own title, her supplier's name,
  // one email field. Bouncing her to `/login` would hand somebody with no AI Matrx
  // account a door she cannot open, and would lose the slug that says which portal
  // she was invited to. Nothing product-shaped resolves before she signs in —
  // `custom.portal_public` answers only the sign-in panel's own words, and every
  // read of her records needs `auth.uid()` at the door. The departed-member portal
  // below keeps its guest block for the reason written there.
  if (pathname === "/portal/c" || pathname.startsWith("/portal/c/")) return false;

  return (
    pathname.startsWith("/administration") ||
    pathname.startsWith("/api/admin") ||
    pathname === "/dashboard" ||
    pathname.startsWith("/dashboard/") ||
    // The authenticated Flashcards tool mounts owned-deck, category, and
    // study-data clients. Anonymous decks have their own `/p/e/fc_set/*`
    // surface, so guests must stop here before any of those clients mount.
    pathname === "/education/flashcards" ||
    pathname.startsWith("/education/flashcards/") ||
    // Agent authoring is an account workspace. The public acquisition page is
    // `/agents`, but builders must never mount their data clients as `anon`.
    /^\/agents\/(?:new\/(?:builder|customizer|instant|tabs)|[^/]+\/build)(?:\/|$)/.test(
      pathname,
    ) ||
    pathname === "/hr" ||
    pathname.startsWith("/hr/") ||
    // The departed-member portal needs a signed-in person: consent to disclose your own income
    // is the subject's and nobody else's, so there is no anonymous lane into it.
    pathname === "/portal" ||
    pathname.startsWith("/portal/") ||
    pathname === "/launchpad" ||
    pathname.startsWith("/launchpad/") ||
    pathname === "/projects" ||
    pathname.startsWith("/projects/") ||
    pathname === "/scraper" ||
    pathname.startsWith("/scraper/") ||
    pathname === "/tasks" ||
    pathname.startsWith("/tasks/") ||
    // The Detail primitive's page presentation (`/detail/<type>/<id>`) is the
    // shape a record link takes when it is SHARED. A signed-out visitor
    // following one used to get the shell, an invented title and a load
    // failure — the record reading as broken rather than as a closed door.
    // Stopping here sends them through the login primitive, which keeps the
    // record as their destination (utils/auth/FEATURE.md).
    pathname === "/detail" ||
    pathname.startsWith("/detail/") ||
    // `/o/<id>` — the one address every feature mints for an id (lib/deep-link/openPath.ts).
    // Its whole answer depends on WHO is asking, so a guest goes through the login primitive
    // with this address kept as the destination instead of reading a "not yours" that is only
    // true because nobody is signed in.
    pathname === "/o" ||
    pathname.startsWith("/o/") ||
    // `/redeem?code=` redeems a free-time coupon for the signed-in person; a
    // guest signs in (or up) first and the code comes back as the destination.
    pathname === "/redeem"
  );
}

/** The pages that exist to CREATE or ENTER an account. */
export const ACCOUNT_ENTRY_PAGES: ReadonlySet<string> = new Set([
  "/login",
  "/sign-up",
  "/check-email",
]);

/**
 * GUEST vs MEMBER at the proxy (guests-use-everything D2, 2026-10-11).
 *
 * `user` is the proxy's getClaims result (claims spread, `id` = `sub`). A GUEST
 * is an anonymous Supabase session (`is_anonymous: true`): it carries a verified
 * identity but no account, so it must be able to REACH `/sign-up` and `/login`
 * (that is how a guest becomes a member), and on a route that needs an account
 * it is sent through the login primitive exactly like a visitor.
 */
export function isMemberSession(
  user: { is_anonymous?: unknown } | null | undefined,
): boolean {
  return !!user && user.is_anonymous !== true;
}

/** True when this session is bounced OFF an account-entry page: members only. */
export function bouncesOffAccountEntryPage(
  pathname: string,
  user: { is_anonymous?: unknown } | null | undefined,
): boolean {
  return ACCOUNT_ENTRY_PAGES.has(pathname) && isMemberSession(user);
}

/** True when the proxy must send this request through the login primitive. */
export function sendsToLogin(
  pathname: string,
  user: { is_anonymous?: unknown } | null | undefined,
): boolean {
  return !isMemberSession(user) && routeRequiresAuthentication(pathname);
}
