/**
 * Profile sites (GitHub, Hugging Face, Substack, Bluesky…), pinned by the case table aidream's matrx-social runs
 * too (packages/matrx-social/tests/fixtures/profile_site_cases.json — identical file).
 */
import cases from "./profile_site_cases.json";
import { PROFILE_SITES, profileSiteHandle, profileSiteUrl } from "../profile-sites";
import { platformLabel } from "../components/PlatformMark";

type Case = { url: string; site: string | null; handle: string | null };

describe("profile site case table (shared with matrx-social)", () => {
  it.each(cases as Case[])("$url", ({ url, site, handle }) => {
    expect(profileSiteHandle(url)).toEqual(site ? { site, handle } : null);
  });

  it("every site round-trips its own profile address", () => {
    for (const s of PROFILE_SITES) {
      const handle = s.id === "stackoverflow" ? "22656/someone" : "someone";
      expect(profileSiteHandle(profileSiteUrl(s.id, handle))).toEqual({ site: s.id, handle });
    }
  });

  it("a profile site reads by its own name on screen", () => {
    expect(platformLabel("github")).toBe("GitHub");
    expect(platformLabel("huggingface")).toBe("Hugging Face");
    expect(platformLabel("kofi")).toBe("Ko-fi");
  });
});
