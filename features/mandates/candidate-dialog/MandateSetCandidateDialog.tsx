"use client";

// features/mandates/candidate-dialog/MandateSetCandidateDialog.tsx
//
// SetCandidateDialog for doors that know only the mandate KEY (Try as
// candidate, Find Usages): it reads the mandate's home organization first, so
// the "Everyone" level names the organization it covers — the same label the
// mandate's own Candidates tab shows. Absent until the read answers (a level
// that says "Everyone" and then corrects itself is not honest).

import { SetCandidateDialog, type SetCandidateDialogProps } from "./SetCandidateDialog";
import { useMandateHomeBound } from "./useMandateHomeBound";

export function MandateSetCandidateDialog(props: Omit<SetCandidateDialogProps, "homeName">) {
  const { ready, homeName } = useMandateHomeBound(props.mandateKey);
  if (!ready) return null;
  return <SetCandidateDialog {...props} homeName={homeName} />;
}
