// utils/next-config/headers.js

// ── SECURITY HEADERS (CASA AL1, 2026-10-22) ─────────────────────────────────
// Next applies EVERY matching rule; when two rules set the same key the LATER
// one wins. So the global block comes first and the per-route rules after it
// (`/q/:token` re-tightens Referrer-Policy to no-referrer).
//
// Route handlers that build their own Response keep their own headers:
// `app/kind-sandbox/route.ts` (CSP with `frame-ancestors <app origin>`),
// `app/auth/extension-callback/route.ts` (`frame-ancestors 'none'`) and
// `app/api/image-proxy/route.ts` (`sandbox`). They are left out of every rule
// that sets a key they set, so no config header can replace their policy.

/** Every feature not listed keeps the browser default (allowed for self, delegable to iframes). */
const PERMISSIONS_POLICY = [
    // Voice input, read-aloud capture, meetings, screen recording, HR clock-in location.
    "camera=(self)",
    "microphone=(self)",
    "display-capture=(self)",
    "geolocation=(self)",
    // Hardware nothing on the platform uses. Motion sensors stay unlisted: the
    // matrx-jump game reads DeviceMotion and video embeds delegate them.
    "usb=()",
    "serial=()",
    "hid=()",
    "bluetooth=()",
    "midi=()",
    "browsing-topics=()",
].join(", ");

const DESKTOP_FRAME_ANCESTORS_VALUE =
    "frame-ancestors 'self' tauri://localhost http://tauri.localhost https://tauri.localhost http://localhost:1420";

// HSTS with includeSubDomains only on our own aimatrx.com hosts. Customer custom
// domains are served by this same app; pinning every subdomain they own to HTTPS
// for two years is not ours to decide (Vercel's own default HSTS still applies there).
const OWN_HOST_HSTS_RULE = {
    source: "/:path*",
    has: [{ type: "host", value: "(?:.*\\.)?aimatrx\\.com" }],
    headers: [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }],
};

const GLOBAL_SECURITY_HEADERS = [
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: PERMISSIONS_POLICY },
];

/**
 * Clickjacking guard: only our own pages and the Matrx Local desktop app may frame us.
 * The desktop app's in-app browser (matrx-local desktop/src/pages/BrowserPage.tsx)
 * frames any aimatrx.com page from its webview origin, so this is CSP
 * `frame-ancestors` alone — `X-Frame-Options` cannot name those origins and
 * would refuse them. CSP is frame-ancestors ONLY — no script-src rollout here.
 */
const SAME_ORIGIN_FRAMING = [
    { key: "Content-Security-Policy", value: DESKTOP_FRAME_ANCESTORS_VALUE },
];

// Pages a stranger's site embeds, each only in its embed mode (`?embed=…`):
//   /applets/<slug>?embed=widget — features/applets/components/builder/EmbedSnippet.tsx
//   /f/<formId>?embed=1          — public/embed/form.js + the records-ui inline snippet
//   /site/<slug>?embed=1         — features/spaces/publish/embed-snippet.ts
// Without `embed` they are ordinary pages and get the same-origin rule below.
const THIRD_PARTY_EMBED_PREFIXES = ["applets", "f", "site"];

// The Matrx Local desktop app frames this page from its own webview origin
// (matrx-local desktop/src/pages/AiMatrx.tsx → <web origin>/demos/local-tools).
const DESKTOP_EMBED_PATH = "demos/local-tools";
const DESKTOP_FRAME_ANCESTORS = DESKTOP_FRAME_ANCESTORS_VALUE;

const OWN_FRAME_POLICY_ROUTES = ["kind-sandbox", "auth/extension-callback", "api/image-proxy"];

const FRAME_RULE_EXCLUSIONS = [
    ...OWN_FRAME_POLICY_ROUTES.map((p) => `${p}(?:/|$)`),
    ...THIRD_PARTY_EMBED_PREFIXES.map((p) => `${p}/`),
    `${DESKTOP_EMBED_PATH}(?:/|$)`,
].join("|");

// A config header OUTRANKS the same key set by a route handler (measured: the
// global Referrer-Policy replaced kind-sandbox's `no-referrer`), so these
// routes get only the keys they never set themselves.
const OWN_POLICY_EXCLUSION = OWN_FRAME_POLICY_ROUTES.map((p) => `${p}(?:/|$)`).join("|");
const TRANSPORT_AND_FEATURES = GLOBAL_SECURITY_HEADERS.filter(
    (h) => h.key === "Permissions-Policy",
);

const securityHeaders = () => [
    OWN_HOST_HSTS_RULE,
    { source: `/:path((?!${OWN_POLICY_EXCLUSION}).*)`, headers: GLOBAL_SECURITY_HEADERS },
    ...OWN_FRAME_POLICY_ROUTES.map((p) => ({ source: `/${p}/:path*`, headers: TRANSPORT_AND_FEATURES })),
    { source: `/:path((?!${FRAME_RULE_EXCLUSIONS}).*)`, headers: SAME_ORIGIN_FRAMING },
    ...THIRD_PARTY_EMBED_PREFIXES.map((prefix) => ({
        source: `/${prefix}/:path*`,
        missing: [{ type: "query", key: "embed" }],
        headers: SAME_ORIGIN_FRAMING,
    })),
    {
        source: `/${DESKTOP_EMBED_PATH}/:path*`,
        headers: [{ key: "Content-Security-Policy", value: DESKTOP_FRAME_ANCESTORS }],
    },
];

exports.getHeaders = () => [
    ...securityHeaders(),
    // THE ACTION-REQUEST LINK'S TOKEN MUST NOT LEAK.
    //
    // `/q/<token>` is a one-tap link texted to a person; the token in that path
    // is the capability. Without `no-referrer`, every outbound request the page
    // makes — and every link a person follows off it — hands the whole URL,
    // token included, to somebody else's server and access log. `noindex` is
    // belt-and-braces beside the page's own `robots` metadata: a header also
    // covers a crawler that never parses the HTML.
    {
        source: "/q/:token",
        headers: [
            {
                key: "Referrer-Policy",
                value: "no-referrer",
            },
            {
                key: "X-Robots-Tag",
                value: "noindex",
            },
        ],
    },
    {
        source: "/:path*.wasm",
        headers: [
            {
                key: "Content-Type",
                value: "application/wasm",
            },
        ],
    },
    {
        source: "/:path*.mjs",
        headers: [
            {
                key: "Content-Type",
                value: "text/javascript",
            },
        ],
    },
    {
        source: "/:path*.onnx",
        headers: [
            {
                key: "Content-Type",
                value: "application/octet-stream",
            },
        ],
    },
    {
        source: "/:all*(svg|jpg|png)",
        headers: [
            {
                key: "Cache-Control",
                value: "public, max-age=31536000, immutable",
            },
        ],
    },
];


// exports.getHeaders = () => [
//     {
//         source: "/(.*)",
//         headers: [
//             {
//                 key: "Cross-Origin-Opener-Policy",
//                 value: "same-origin",
//             },
//             {
//                 key: "Cross-Origin-Embedder-Policy",
//                 value: "credentialless",
//             },
//             {
//                 key: "Cross-Origin-Resource-Policy",
//                 value: "cross-origin", // Allows Google Fonts and CDN
//             },
//         ],
//     },
//     {
//         source: "/:path*.wasm",
//         headers: [
//             {
//                 key: "Content-Type",
//                 value: "application/wasm",
//             },
//         ],
//     },
//     {
//         source: "/:path*.mjs",
//         headers: [
//             {
//                 key: "Content-Type",
//                 value: "text/javascript",
//             },
//         ],
//     },
//     {
//         source: "/:path*.onnx",
//         headers: [
//             {
//                 key: "Content-Type",
//                 value: "application/octet-stream",
//             },
//         ],
//     },
//     {
//         source: "/:all*(svg|jpg|png)",
//         headers: [
//             {
//                 key: "Cache-Control",
//                 value: "public, max-age=31536000, immutable",
//             },
//         ],
//     },
// ];
