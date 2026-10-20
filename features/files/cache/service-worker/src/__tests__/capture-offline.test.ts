import fs from "node:fs";
import path from "node:path";
import {
  captureCacheName,
  isCaptureDefinitionRequest,
  isCaptureNavigationRequest,
  nextStaticUrls,
  staleCaptureCaches,
} from "../offline-routing";

const ORIGIN = "https://aimatrx.com";
const nav = (p: string, m = "GET", mode = "navigate", o = ORIGIN) =>
  isCaptureNavigationRequest(m, mode, o, p, ORIGIN);

describe("offline capture: what the worker claims", () => {
  it("claims a top-level navigation to exactly /capture/<sheet>", () => {
    expect(nav("/capture/abc-123")).toBe(true);
    expect(nav("/capture/abc-123/")).toBe(true);
  });

  it("claims nothing else (a wide claim eats chunk loads and other pages)", () => {
    expect(nav("/capture")).toBe(false);
    expect(nav("/capture/")).toBe(false);
    expect(nav("/capture/abc/extra")).toBe(false);
    expect(nav("/captures/abc")).toBe(false);
    expect(nav("/education")).toBe(false);
    expect(nav("/capture/abc", "POST")).toBe(false);
    expect(nav("/capture/abc", "GET", "cors")).toBe(false);
    expect(nav("/capture/abc", "GET", "navigate", "https://evil.example")).toBe(false);
  });

  it("claims only the two doors that define a sheet", () => {
    expect(isCaptureDefinitionRequest("POST", "/rest/v1/rpc/capture_open")).toBe(true);
    expect(isCaptureDefinitionRequest("POST", "/rest/v1/rpc/where_id_opens")).toBe(true);
    expect(isCaptureDefinitionRequest("POST", "/rest/v1/rpc/capture_submit")).toBe(false);
    expect(isCaptureDefinitionRequest("POST", "/rest/v1/rpc/read_record")).toBe(false);
    expect(isCaptureDefinitionRequest("GET", "/rest/v1/rpc/capture_open")).toBe(false);
  });
});

describe("offline capture: a release replaces the cache", () => {
  it("names the cache by build and deletes every other build's capture cache, and only those", () => {
    expect(captureCacheName("b2")).not.toBe(captureCacheName("b1"));
    const names = [captureCacheName("b1"), captureCacheName("b2"), "matrx-study-shell-v1", "other"];
    expect(staleCaptureCaches(names, "b2")).toEqual([captureCacheName("b1")]);
  });

  it("the worker is stamped with a build id at build time", () => {
    const root = path.resolve(__dirname, "../..");
    expect(fs.readFileSync(path.join(root, "build-sw.ts"), "utf8")).toMatch(/__SW_BUILD_ID__/);
    expect(fs.readFileSync(path.join(root, "src/sw.ts"), "utf8")).toMatch(/staleCaptureCaches\(names, BUILD_ID\)/);
  });
});

describe("offline capture: the chunks the page names", () => {
  it("lists same-origin /_next/static files once each, nothing foreign", () => {
    const html =
      `<script src="/_next/static/chunks/a-1a2b3c4d5e.js"></script>` +
      `<link rel="stylesheet" href="/_next/static/css/b.9f8e7d6c.css">` +
      `<script src="/_next/static/chunks/a-1a2b3c4d5e.js"></script>` +
      `<script src="https://cdn.example/_next/static/x.js"></script>`;
    expect(nextStaticUrls(html, ORIGIN).sort()).toEqual([
      "/_next/static/chunks/a-1a2b3c4d5e.js",
      "/_next/static/css/b.9f8e7d6c.css",
    ]);
  });
});
