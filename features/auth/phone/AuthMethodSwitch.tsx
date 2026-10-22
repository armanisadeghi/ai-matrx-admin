"use client";

// features/auth/phone/AuthMethodSwitch.tsx
//
// The Email | Phone choice on /login and /sign-up. Email is the default; a page
// opened for a phone (a coupon texted to a number) starts on Phone. The email
// form is rendered by the page (a server component) and passed in unchanged.

import { useState, type ReactNode } from "react";
import { SegmentedControl } from "@ai-matrx/design-system/controls";
import { PhoneCodeForm } from "./PhoneCodeForm";

type Method = "email" | "phone";

const METHODS = [
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
] as const;

interface AuthMethodSwitchProps {
  emailForm: ReactNode;
  redirectTo: string | null;
  defaultPhone?: string | null;
  initialMethod?: Method;
  phoneSubmitLabel: string;
}

export function AuthMethodSwitch({
  emailForm,
  redirectTo,
  defaultPhone,
  initialMethod = "email",
  phoneSubmitLabel,
}: AuthMethodSwitchProps) {
  const [method, setMethod] = useState<Method>(initialMethod);
  return (
    <div className="space-y-4">
      <SegmentedControl<Method>
        aria-label="Sign in with"
        value={method}
        onValueChange={setMethod}
        data={METHODS}
        fill
      />
      {method === "email" ? (
        emailForm
      ) : (
        <PhoneCodeForm defaultPhone={defaultPhone} redirectTo={redirectTo} submitLabel={phoneSubmitLabel} />
      )}
    </div>
  );
}
