/**
 * Sign-up welcome — the ONE place a caller picks the person's name, by the name rule (loginSeed `resolveName`):
 * the provider's name > the name typed at sign-up > a name they typed in the door > the proven GitHub name > the
 * email's name hint > none. Pure. Used by the welcome door (SmartAddBrand door="welcome") and the background found
 * search's verdict (foundSearchBackground.ts), so the two can never disagree about who they are looking at.
 */

import type { EvidenceItem } from "../evidence";
import { provenProfileName, resolveName, type LoginSeed } from "./loginSeed";

export interface WelcomeNameInput {
  /** The login seed (with the domain registry), or null before it is read. */
  seed: LoginSeed | null;
  /** The login's name read without the registry (the stand-in until `seed` lands). */
  loginName?: string | null;
  /** A name the person typed in the door, or one adopted there. */
  later?: string | null;
  /** The evidence on screen, where a proven GitHub profile name may be. */
  visible: Iterable<EvidenceItem>;
}

/** The person's name, and the proven name when it is the one that won (so the door adopts it once). */
export function welcomeNameOf({ seed, loginName = null, later = null, visible }: WelcomeNameInput): { name: string; proven: string | null } {
  const own = seed && seed.nameFrom !== "email" ? seed.name : null;
  if (own) return { name: own, proven: null };
  if (later) return { name: later, proven: null };
  if (!seed) return { name: loginName ?? "", proven: null };
  const proven = provenProfileName(visible);
  const name = resolveName(seed, proven);
  return { name: name ?? "", proven: proven && name === proven ? proven : null };
}
