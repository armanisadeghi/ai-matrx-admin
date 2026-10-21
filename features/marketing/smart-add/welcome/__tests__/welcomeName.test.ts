import type { User } from "@supabase/supabase-js";
import type { EvidenceItem } from "../../evidence";
import { loginSeed } from "../loginSeed";
import { welcomeNameOf } from "../welcomeName";

const RULES = [{ host: "gmail.com", pathPattern: "", category: "free_mail", provenance: "seeded" as const, confidence: 1, label: "" }];

function seedFor(email: string, meta: Record<string, unknown> = {}, identityData: Record<string, unknown> = {}, provider = "email") {
  const user = {
    id: "u1",
    aud: "authenticated",
    app_metadata: {},
    created_at: "2026-10-20T00:00:00Z",
    email,
    email_confirmed_at: "2026-10-20T00:00:00Z",
    user_metadata: meta,
    identities: [{ id: "i1", user_id: "u1", identity_id: "i1", provider, identity_data: identityData }],
  } as unknown as User;
  return loginSeed(user, RULES);
}

/** A GitHub profile the email lookup PROVED is theirs, carrying its profile name. */
const provenGithub = (label: string) =>
  ({
    key: "social:github:dr",
    field: "social",
    value: "https://github.com/dr",
    platform: "github",
    handle: "dr",
    label,
    certainty: "certain",
    source: { node: "email", kind: "social_profile", url: null, where: "the email lookup" },
  }) as unknown as EvidenceItem;

describe("welcomeNameOf: one name rule for the welcome door and the background verdict", () => {
  it("a proven GitHub name beats the email's name hint (the defect: the hint used to win)", () => {
    const seed = seedFor("dana.reyes@gmail.com");
    expect(seed.nameFrom).toBe("email");
    expect(welcomeNameOf({ seed, visible: [provenGithub("Danielle Reyes-Ortiz")] })).toEqual({
      name: "Danielle Reyes-Ortiz",
      proven: "Danielle Reyes-Ortiz",
    });
  });

  it("the name typed at sign-up beats a proven GitHub name", () => {
    const seed = seedFor("dana.reyes@gmail.com", { full_name: "Dana Reyes" });
    expect(welcomeNameOf({ seed, visible: [provenGithub("Danielle Reyes-Ortiz")] })).toEqual({ name: "Dana Reyes", proven: null });
  });

  it("a name typed in the door beats a proven GitHub name", () => {
    const seed = seedFor("dreyes@gmail.com");
    expect(welcomeNameOf({ seed, later: "Dana R", visible: [provenGithub("Danielle Reyes-Ortiz")] })).toEqual({ name: "Dana R", proven: null });
  });

  it("no name anywhere and nothing proven: none (the door asks)", () => {
    const seed = seedFor("dreyes@gmail.com");
    expect(welcomeNameOf({ seed, visible: [] })).toEqual({ name: "", proven: null });
  });

  it("only the email hint: the hint", () => {
    const seed = seedFor("dana.reyes@gmail.com");
    expect(welcomeNameOf({ seed, visible: [] })).toEqual({ name: "Dana Reyes", proven: null });
  });
});
