"use client";

import dynamic from "next/dynamic";

export type { IconInputWithValidationProps } from "./IconInputWithValidation";

function IconInputSkeleton() {
  return (
    <div
      className="h-10 w-full animate-pulse rounded-md bg-muted"
      aria-hidden
    />
  );
}

const IconInputWithValidation = dynamic(
  () => import("./IconInputWithValidation"),
  { ssr: false, loading: IconInputSkeleton },
);

export const IconInputCompact = dynamic(
  () => import("./IconInputWithValidation").then((m) => m.IconInputCompact),
  { ssr: false, loading: IconInputSkeleton },
);

export default IconInputWithValidation;
