/**
 * Route ownership at the Python API boundary.
 *
 * The standalone matrx-files service intentionally owns only the routes
 * listed here. Broader file-adjacent APIs such as `/files/{id}/ingest`, Knowledge,
 * annotations, and media processing still belong to aidream and must not be
 * moved merely because their path starts with `/files`.
 */

import { BACKEND_URLS } from "@/lib/api/endpoints";
import { DESCRIPTORS as FILES_DESCRIPTORS } from "@ai-matrx/api/files";

export const API_SERVICES = ["aidream", "scraper", "files", "seo"] as const;

export type ApiService = (typeof API_SERVICES)[number];
export type ServiceEnvironment = "production" | "localhost";

/**
 * Loopback API targets are always available in a development bundle, and in a
 * production bundle ONLY while an admin is signed in.
 *
 * Two failure modes this balances:
 *   - A deployed site must never route an ordinary visitor's API traffic to
 *     their own `localhost` (the persisted selection is browser-wide, not
 *     account-scoped, so it would otherwise survive logout into a non-admin
 *     session).
 *   - An admin pointing the deployed frontend at their local Python server is
 *     a first-class workflow. Blocking it is a defect, not "security".
 *
 * The unlock is a module-level mirror of Redux admin state so non-React
 * callers (`configuredServiceUrl`, slice reducers) can read it synchronously.
 * `providers/LoopbackApiAccessSync.tsx` is the ONLY writer.
 */
let loopbackAdminUnlock = false;

export function setLoopbackApiTargetsAdminUnlock(unlocked: boolean): void {
  loopbackAdminUnlock = unlocked;
}

export function allowsLoopbackApiTargets(
  nodeEnv: string | undefined = process.env.NODE_ENV,
): boolean {
  return nodeEnv !== "production" || loopbackAdminUnlock;
}

export function isLoopbackApiUrl(value: string | null | undefined): boolean {
  if (!value) return false;
  try {
    const hostname = new URL(value).hostname;
    return (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "[::1]"
    );
  } catch {
    return false;
  }
}

export const API_SERVICE_LABELS: Record<ApiService, string> = {
  aidream: "AI / aidream",
  scraper: "Scraper",
  files: "Files",
  seo: "SEO",
};

/**
 * The one browser-visible origin map for independently deployed Python services.
 * Production origins can be replaced per deployment; loopback defaults match each
 * package's supported local launcher.
 */
export const API_SERVICE_URLS: Record<
  ApiService,
  Record<ServiceEnvironment, string | undefined>
> = {
  aidream: {
    production: BACKEND_URLS.production,
    localhost: BACKEND_URLS.localhost,
  },
  scraper: {
    production:
      process.env.NEXT_PUBLIC_SCRAPER_URL ??
      "https://scraper.app.matrxserver.com",
    localhost:
      process.env.NEXT_PUBLIC_SCRAPER_URL_LOCAL ?? "http://localhost:8001",
  },
  files: {
    production:
      process.env.NEXT_PUBLIC_FILES_URL ?? "https://files.matrxserver.com",
    localhost:
      process.env.NEXT_PUBLIC_FILES_URL_LOCAL ?? "http://127.0.0.1:8090",
  },
  seo: {
    production:
      process.env.NEXT_PUBLIC_SEO_URL ?? "https://seo.matrxserver.com",
    localhost: process.env.NEXT_PUBLIC_SEO_URL_LOCAL ?? "http://127.0.0.1:8081",
  },
};

/**
 * The path prefix a service mounts EVERY route under, kept on the request
 * base. 🚨 The shared URL builder (`buildMatrxRequestUrl`,
 * @ai-matrx/api) strips a leading `/api/` from every path because
 * aidream's routes no longer live there — but the standalone scraper still
 * mounts its whole router at `/api`, so without this every scrape went to a
 * path the service does not serve (404, found 2026-10-05). Putting the prefix
 * on the BASE survives the strip for every caller of the one request pipeline.
 */
export const SERVICE_ROUTE_PREFIX: Record<ApiService, string> = {
  aidream: "",
  scraper: "/api",
  files: "",
  seo: "",
};

/** The base a request to `service` is built on: its origin plus its route prefix. */
export function serviceRequestBase(
  service: ApiService,
  origin: string | undefined,
): string | undefined {
  if (!origin) return origin;
  return `${origin.replace(/\/+$/, "")}${SERVICE_ROUTE_PREFIX[service]}`;
}

export function configuredServiceUrl(
  service: ApiService,
  environment: ServiceEnvironment,
): string | undefined {
  const url = API_SERVICE_URLS[service][environment]?.replace(/\/+$/, "");
  if (
    !allowsLoopbackApiTargets() &&
    (environment === "localhost" || isLoopbackApiUrl(url))
  ) {
    return undefined;
  }
  return url;
}

const UUID_SEGMENT =
  "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

interface ServiceRouteRule {
  pattern: RegExp;
  methods: ReadonlySet<string>;
}

/** A contract path template as a matcher: `{…_id}` is a uuid segment, any other `{…}` one segment. */
function templatePattern(template: string): RegExp {
  const body = template
    .split("/")
    .map((segment) => {
      const param = /^\{([a-z_]+)\}$/.exec(segment);
      if (!param) return segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return param[1].endsWith("_id") ? UUID_SEGMENT : "[^/]+";
    })
    .join("/");
  return new RegExp(`^${body}/?$`, "i");
}

/**
 * The routes the standalone `matrx-files` deployment answers — READ from the generated API
 * contract (`@ai-matrx/api/files` DESCRIPTORS: each operation with the deployment the contract
 * routes it to), never kept by hand here. A ` @files` key is the files service's SECOND copy of a
 * route the contract sends elsewhere, so only primary keys count.
 */
const STANDALONE_FILE_ROUTE_RULES: readonly ServiceRouteRule[] = (() => {
  const byPath = new Map<string, Set<string>>();
  for (const [key, op] of Object.entries(FILES_DESCRIPTORS)) {
    if (op.d !== "files" || key.includes(" @")) continue;
    const methodsForPath = byPath.get(op.p) ?? new Set<string>();
    methodsForPath.add(op.m.toUpperCase());
    byPath.set(op.p, methodsForPath);
  }
  return [...byPath].map(([template, methodsForPath]) => ({
    pattern: templatePattern(template),
    methods: methodsForPath,
  }));
})();

/** True only when the deployed standalone service owns this exact route. */
export function isStandaloneFileServiceRoute(
  path: string,
  method?: string,
): boolean {
  const pathname = path.split(/[?#]/, 1)[0];
  const normalizedMethod = method?.toUpperCase();
  return STANDALONE_FILE_ROUTE_RULES.some(
    (rule) =>
      rule.pattern.test(pathname) &&
      (!normalizedMethod || rule.methods.has(normalizedMethod)),
  );
}

/**
 * The standalone `matrx-files` service OWNS these routes — browser traffic goes
 * there unconditionally. There is deliberately no toggle: route ownership is a
 * property of the architecture, not of an environment variable. (A
 * `NEXT_PUBLIC_FILES_BROWSER_CUTOVER` env gate lived here until 2026-07-28 and
 * silently kept every browser upload on aidream for two weeks after the CORS
 * problem it was added for had been fixed.) Which HOST answers — production,
 * localhost, or an admin pin — is resolved separately by `resolveFilesBaseUrl`.
 */
export function shouldRouteBrowserRequestToStandaloneFiles(
  path: string,
  method: string | undefined,
): boolean {
  return isStandaloneFileServiceRoute(path, method);
}

/** Resolve and normalize the optional public files-service origin. */
export function configuredFilesServiceUrl(): string | undefined {
  return configuredServiceUrl("files", "production");
}
