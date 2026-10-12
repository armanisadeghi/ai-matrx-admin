"use client";

// features/esign/envelopes/CorrectDialog.tsx — Docusign "Correct" on a sent envelope: change the name,
// email, way of opening, access code and order of recipients who have NOT acted, remove one, add one.
// Recipients who have acted are listed locked (the database refuses any change to them). Each change
// goes through aidream's correction doors; the changed or added person gets a fresh link email.

import { useState } from "react";
import { ArrowDown, ArrowUp, Lock, Trash2, UserPlus } from "lucide-react";

import { Badge, Button, Field, Select } from "@ai-matrx/design-system/controls";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ProInput } from "@/components/official/ProInput";
import { toast } from "@/lib/toast";
import { useAppDispatch } from "@/lib/redux/hooks";

import { ACCESS_CODE_MAX, ACCESS_CODE_MIN, isEmail } from "../editor/model";
import { addRecipient, correctRecipient, EnvelopeRefusal, removeRecipient, type RecipientVerificationWord } from "./service";
import { LOCKED_RECIPIENT_REASON, LOCKED_RECIPIENT_STATUSES } from "./types";

const VERIFY_OPTIONS: { value: RecipientVerificationWord; label: string }[] = [
  { value: "none", label: "Email link" },
  { value: "email_code", label: "Email code" },
  { value: "access_code", label: "Access code" },
];

export interface CorrectableRecipient {
  id: string;
  full_name: string;
  email: string;
  position: number;
  status: string;
  external: boolean;
  verification: RecipientVerificationWord;
  role: string;
}

interface Props {
  open: boolean;
  envelopeId: string;
  sequential: boolean;
  recipients: CorrectableRecipient[];
  onClose(): void;
  /** Something changed: the page reads the envelope again. */
  onChanged(): void;
}

export function CorrectDialog({ open, envelopeId, sequential, recipients, onClose, onChanged }: Props) {
  const sorted = [...recipients].sort((a, b) => a.position - b.position);
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Correct recipients</DialogTitle>
          <DialogDescription>Changed people get a fresh link. Those who signed stay locked.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          {sorted.map((r) =>
            LOCKED_RECIPIENT_STATUSES.has(r.status) ? (
              <div key={r.id} className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2">
                <Lock className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="truncate type-title">{r.full_name}</div>
                  <div className="truncate type-secondary text-muted-foreground">{LOCKED_RECIPIENT_REASON[r.status]}</div>
                </div>
              </div>
            ) : (
              <RecipientRow key={`${r.id}-${r.full_name}-${r.email}-${r.position}-${r.verification}`} r={r} envelopeId={envelopeId} sequential={sequential} lastStep={sorted.length} onChanged={onChanged} />
            ),
          )}
          <AddRow envelopeId={envelopeId} sequential={sequential} nextStep={sorted.length + 1} onChanged={onChanged} />
        </div>
        <DialogFooter>
          <Button variant="primary" onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RecipientRow({ r, envelopeId, sequential, lastStep, onChanged }: { r: CorrectableRecipient; envelopeId: string; sequential: boolean; lastStep: number; onChanged(): void }) {
  const dispatch = useAppDispatch();
  const [name, setName] = useState(r.full_name);
  const [email, setEmail] = useState(r.email);
  const [verification, setVerification] = useState<RecipientVerificationWord>(r.verification);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);

  const codeOk = code === "" || (code.trim().length >= ACCESS_CODE_MIN && code.trim().length <= ACCESS_CODE_MAX);
  const dirty = name.trim() !== r.full_name || email.trim().toLowerCase() !== r.email.toLowerCase() || verification !== r.verification || code.trim() !== "";
  const valid = name.trim() !== "" && isEmail(email.trim()) && codeOk && !(verification === "access_code" && r.verification !== "access_code" && code.trim() === "");

  async function act(work: () => Promise<{ granted: boolean }>, done: string) {
    setBusy(true);
    try {
      await work();
      toast.success(done);
      onChanged();
    } catch (err) {
      toast.error(err instanceof EnvelopeRefusal ? err.message : "That could not be changed right now.");
    } finally {
      setBusy(false);
    }
  }

  const save = () =>
    act(
      () =>
        correctRecipient(dispatch, envelopeId, r.id, {
          ...(name.trim() !== r.full_name ? { full_name: name.trim() } : {}),
          ...(email.trim().toLowerCase() !== r.email.toLowerCase() ? { email: email.trim() } : {}),
          ...(r.external && verification !== r.verification ? { verification } : {}),
          ...(code.trim() ? { access_code: code.trim() } : {}),
        }),
      r.external ? "Changed. They have a fresh link." : "Changed.",
    );
  const move = (position: number) => act(() => correctRecipient(dispatch, envelopeId, r.id, { position }), "Order changed.");

  return (
    <div className="flex flex-col gap-2 rounded-md border border-border bg-card p-3">
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <ProInput aria-label="Legal full name" placeholder="Legal full name" value={name} disabled={!r.external || busy} onChange={(e) => setName(e.target.value)} />
        </div>
        {!r.external && <Badge tone="info">Member</Badge>}
        {sequential && (
          <>
            <Button variant="quiet" aria-label="Move earlier" icon={<ArrowUp />} disabled={busy || r.position <= 1} onClick={() => void move(r.position - 1)} />
            <Button variant="quiet" aria-label="Move later" icon={<ArrowDown />} disabled={busy || r.position >= lastStep} onClick={() => void move(r.position + 1)} />
          </>
        )}
      </div>
      {r.external && (
        <>
          <Field aria-label="Email" type="email" placeholder="Email" value={email} disabled={busy} onChange={(e) => setEmail(e.target.value)} />
          <Select aria-label="How they open it" value={verification} options={VERIFY_OPTIONS} onValueChange={setVerification} />
          {verification === "access_code" && (
            <Field
              aria-label="Access code"
              type="password"
              autoComplete="off"
              maxLength={ACCESS_CODE_MAX + 4}
              placeholder={r.verification === "access_code" ? "Code set" : `${ACCESS_CODE_MIN} to ${ACCESS_CODE_MAX} characters`}
              value={code}
              disabled={busy}
              onChange={(e) => setCode(e.target.value)}
            />
          )}
        </>
      )}
      {confirmRemove ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="type-secondary text-destructive">Their link stops working. This cannot be undone.</span>
          <span className="flex gap-1.5">
            <Button variant="quiet" disabled={busy} onClick={() => setConfirmRemove(false)}>Keep</Button>
            <Button variant="danger" disabled={busy} onClick={() => void act(() => removeRecipient(dispatch, envelopeId, r.id), "Removed.")}>Remove</Button>
          </span>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2">
          <Button variant="quiet" icon={<Trash2 />} aria-label={`Remove ${r.full_name}`} disabled={busy} onClick={() => setConfirmRemove(true)}>Remove</Button>
          <Button variant="primary" disabled={busy || !dirty || !valid} onClick={() => void save()}>Save</Button>
        </div>
      )}
    </div>
  );
}

function AddRow({ envelopeId, sequential, nextStep, onChanged }: { envelopeId: string; sequential: boolean; nextStep: number; onChanged(): void }) {
  const dispatch = useAppDispatch();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [verification, setVerification] = useState<RecipientVerificationWord>("email_code");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const ready = name.trim() !== "" && isEmail(email.trim()) && (verification !== "access_code" || (code.trim().length >= ACCESS_CODE_MIN && code.trim().length <= ACCESS_CODE_MAX));

  if (!open) return <Button icon={<UserPlus />} onClick={() => setOpen(true)}>Add a person</Button>;

  async function add() {
    setBusy(true);
    try {
      await addRecipient(dispatch, envelopeId, { full_name: name.trim(), email: email.trim(), position: sequential ? nextStep : 1, verification, ...(verification === "access_code" ? { access_code: code.trim() } : {}) });
      toast.success("Added. They have their link.");
      setOpen(false);
      setName("");
      setEmail("");
      setCode("");
      onChanged();
    } catch (err) {
      toast.error(err instanceof EnvelopeRefusal ? err.message : "They could not be added right now.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border border-border p-3">
      <ProInput aria-label="Their legal full name" placeholder="Their legal full name" value={name} onChange={(e) => setName(e.target.value)} />
      <Field aria-label="Their email" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <Select aria-label="How they open it" value={verification} options={VERIFY_OPTIONS} onValueChange={setVerification} />
      {verification === "access_code" && (
        <Field aria-label="Access code" type="password" autoComplete="off" maxLength={ACCESS_CODE_MAX + 4} placeholder={`${ACCESS_CODE_MIN} to ${ACCESS_CODE_MAX} characters`} value={code} onChange={(e) => setCode(e.target.value)} />
      )}
      <div className="flex justify-end gap-1.5">
        <Button variant="quiet" disabled={busy} onClick={() => setOpen(false)}>Cancel</Button>
        <Button variant="primary" disabled={busy || !ready} onClick={() => void add()}>Add</Button>
      </div>
    </div>
  );
}
