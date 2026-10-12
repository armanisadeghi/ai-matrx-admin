"use client";

import { useEffect, useState } from "react";
import { SegmentedControl } from "@ai-matrx/design-system/controls";
import { useAppDispatch } from "@/lib/redux/hooks";
import { BACKEND_URLS } from "@/lib/api/endpoints";
import { setServiceOverride, switchServer } from "@/lib/redux/slices/apiConfigSlice";
import { SmartAddBrand } from "@/features/marketing/smart-add/SmartAddBrand";

const LAB_SERVER_KEY = "matrx.lab.smartAddBrand.server";

/** Lab chrome only: a title and which aidream server answers (live or this computer). */
export function LabSmartAddBrand() {
  const dispatch = useAppDispatch();
  // The lab owns its choice (default: Live server) and applies it on load, so the
  // switch and the address every call goes to can never disagree.
  const [server, setServer] = useState<"production" | "localhost">("production");
  useEffect(() => {
    const saved = window.localStorage.getItem(LAB_SERVER_KEY) === "localhost" ? "localhost" : "production";
    setServer(saved);
  }, []);
  useEffect(() => {
    dispatch(setServiceOverride({ service: "aidream", environment: null }));
    void dispatch(switchServer({ env: server }));
  }, [server, dispatch]);
  const baseUrl = BACKEND_URLS[server] ?? "";
  // "This computer" only works while the server runs on this machine: say so plainly.
  const [localUp, setLocalUp] = useState<boolean | null>(null);
  useEffect(() => {
    if (server !== "localhost") return;
    let alive = true;
    const probe = () =>
      fetch(`${baseUrl}/health`, { cache: "no-store" })
        .then((r) => alive && setLocalUp(r.ok))
        .catch(() => alive && setLocalUp(false));
    void probe();
    const timer = setInterval(probe, 10_000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [server, baseUrl]);
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
            const next = value === "localhost" ? "localhost" : "production";
            window.localStorage.setItem(LAB_SERVER_KEY, next);
            setServer(next);
          }}
        />
      </div>
      {server === "localhost" && localUp === false ? (
        <p className="text-xs text-destructive">
          This computer&apos;s server isn&apos;t running. Switch to Live server.
        </p>
      ) : null}
      <SmartAddBrand />
    </main>
  );
}
