/** Smart Add · person "harder" path → aidream `/brand-intake/person-harder` (shapes in ./types). */
import { postJson } from "@/lib/python-client";
import type { FindYouRequest, FindYouResult, HarderRequest, HarderResult } from "./types";

export async function runHarderRound(req: HarderRequest): Promise<HarderResult> {
  const { data } = await postJson<HarderResult>("/brand-intake/person-harder/round", req);
  return data;
}

/** The hard / close-to-impossible sweep (aidream `POST /brand-intake/person-harder/find-you`). */
export async function runFindYou(req: FindYouRequest): Promise<FindYouResult> {
  const { data } = await postJson<FindYouResult>("/brand-intake/person-harder/find-you", req);
  return data;
}
