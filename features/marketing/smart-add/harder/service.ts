/** Smart Add · person "harder" path → aidream `/brand-intake/person-harder` (shapes in ./types). */
import { postJson } from "@/lib/python-client";
import type { HarderRequest, HarderResult } from "./types";

export async function runHarderRound(req: HarderRequest): Promise<HarderResult> {
  const { data } = await postJson<HarderResult>("/brand-intake/person-harder/round", req);
  return data;
}
