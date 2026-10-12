"use client";

import { SegmentedControl } from "@ai-matrx/design-system/controls";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { selectResolvedBaseUrl, setServiceOverride } from "@/lib/redux/slices/apiConfigSlice";
import { SmartAddBrand } from "@/features/marketing/smart-add/SmartAddBrand";

/** Lab chrome only: a title and which aidream server answers (live or this computer). */
export function LabSmartAddBrand() {
  const dispatch = useAppDispatch();
  // The URL every aidream call actually goes to — the one truth this switch shows.
  const baseUrl = useAppSelector(selectResolvedBaseUrl) ?? "";
  const server = /localhost|127\.0\.0\.1/.test(baseUrl) ? "localhost" : "production";
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col gap-4 px-4 py-8">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold">Smart Add brand</h1>
        <SegmentedControl
          className="ml-auto"
          aria-label="Server"
          value={server}
          data={[
            { value: "production", label: "Live server" },
            { value: "localhost", label: "This computer" },
          ]}
          onValueChange={(value) => {
            dispatch(setServiceOverride({ service: "aidream", environment: value === "localhost" ? "localhost" : "production" }));
          }}
        />
      </div>
      <SmartAddBrand />
    </main>
  );
}
