/**
 * `/marketing/<brand>/…` → `/marketing/brands/<brand>/…` (Arman, 2026-10-22:
 * "Instead of /marketing/some-brand it should be marketing/brands/some-brand/").
 *
 * The brand workspace moved under `/marketing/brands`. Every link built before
 * the move — bookmarks, sent email, stored rows, agent-held URLs, aidream's news
 * digests — still carries the old shape, so it is a CONFIG redirect (a real
 * 308 a browser, email client and crawler honour), never a route shim, which
 * would render the shell first and answer 200.
 *
 * Which first segments are NOT a brand is read from the filesystem: every
 * static directory directly under `app/(core)/marketing` is Marketing's own
 * page and is never redirected, so a new static route can never be swallowed
 * by this rule. When that tree is not on disk (a build profile that parks
 * `(core)`), no `/marketing` route is served and the rule is omitted.
 *
 * Next.js keeps the query string on the destination. Guard:
 * `utils/next-config/marketingBrandRedirects.test.ts` maps every old page
 * pattern through Next's own matcher.
 */

const fs = require("fs");
const path = require("path");

const MARKETING_DIR = path.join(__dirname, "..", "..", "app", "(core)", "marketing");

/** Static first segments under /marketing (route groups, dynamic, private and parallel folders excluded). */
function marketingStaticSegments(dir = MARKETING_DIR) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return null;
  }
  return entries
    .filter((entry) => entry.isDirectory() && !/^[[(@_]/.test(entry.name))
    .map((entry) => entry.name)
    .sort();
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** The redirect rules; [] when the marketing tree is not on disk. */
function marketingBrandRedirects(dir = MARKETING_DIR) {
  const statics = marketingStaticSegments(dir);
  if (!statics || statics.length === 0) return [];
  // Lookahead sees the rest of the path, so `(?:/|$)` pins the whole segment:
  // `/marketing/reports` stays, `/marketing/reports-co` (a brand key) moves.
  const notStatic = `(?!(?:${statics.map(escapeRegex).join("|")})(?:/|$))`;
  return [
    {
      source: `/marketing/:brand(${notStatic}[^/]+)/:rest*`,
      destination: "/marketing/brands/:brand/:rest*",
      permanent: true,
    },
  ];
}

module.exports = { marketingBrandRedirects, marketingStaticSegments };
