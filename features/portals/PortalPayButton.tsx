"use client";

// PAYMENTS-CONNECT portal Pay: one press opens Stripe Checkout on the organization's own account.
// Pending while the server opens the session (no double submit), a refusal is said in place
// (REVIEW-PAYMENTS I2/I6), and after a cancelled checkout the same button reads "Pay again" (I7).

import { useActionState } from "react";
import { Button } from "@ai-matrx/design-system/controls";

export type PortalPayState = { error: string | null };

export function PortalPayButton({
  label,
  action,
}: {
  label: string;
  action: (state: PortalPayState, formData: FormData) => Promise<PortalPayState>;
}) {
  const [state, formAction, pending] = useActionState(action, { error: null });
  return (
    <form action={formAction} className="flex flex-col items-end gap-1">
      <Button type="submit" variant="primary" disabled={pending}>
        {pending ? "Opening checkout..." : label}
      </Button>
      {state.error ? (
        <p role="alert" className="text-xs text-destructive">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
