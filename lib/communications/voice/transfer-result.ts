/** Provider evidence, not a claim that a person completed the caller's work. */
export interface VoiceTransferResult {
  providerAccountId: string;
  providerCallId: string;
  providerDialCallId: string;
  status: "completed" | "busy" | "no-answer" | "failed" | "canceled";
  durationSeconds: number | null;
  bridged: boolean | null;
}

/** This endpoint handles a single Number leg; answered belongs to conferences. */
export function parseVoiceTransferResult(
  params: Record<string, string>,
): VoiceTransferResult | null {
  if (
    !/^AC[0-9a-f]{32}$/i.test(params.AccountSid ?? "") ||
    !/^CA[0-9a-f]{32}$/i.test(params.CallSid ?? "") ||
    !/^CA[0-9a-f]{32}$/i.test(params.DialCallSid ?? "") ||
    params.CallSid === params.DialCallSid
  )
    return null;
  const status = params.DialCallStatus;
  if (
    status !== "completed" &&
    status !== "busy" &&
    status !== "no-answer" &&
    status !== "failed" &&
    status !== "canceled"
  )
    return null;
  const duration = params.DialCallDuration;
  if (
    duration !== undefined &&
    (!/^(0|[1-9]\d{0,9})$/.test(duration) || Number(duration) > 2147483647)
  )
    return null;
  const bridged = params.DialBridged;
  if (bridged !== undefined && bridged !== "true" && bridged !== "false")
    return null;
  return {
    providerAccountId: params.AccountSid,
    providerCallId: params.CallSid,
    providerDialCallId: params.DialCallSid,
    status,
    durationSeconds: duration === undefined ? null : Number(duration),
    bridged: bridged === undefined ? null : bridged === "true",
  };
}
