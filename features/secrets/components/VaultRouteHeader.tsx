"use client";

/**
 * Header for /vault. Identity only — the Vault workspace (`@ai-matrx/vault`)
 * owns its own search, vault switcher, One-time passwords, browsers and add
 * actions, so repeating them up here would give the route two toolbars.
 */
import { ShieldCheck } from "lucide-react";
import RouteHeader from "@/features/shell/components/header/RouteHeader";

/** Mounts itself into the shell header — render it bare, never inside <PageHeader>. */
export function VaultRouteHeader() {
  return (
    <RouteHeader
      left={
        <div className="flex min-w-0 items-center gap-2 px-1">
          <ShieldCheck className="h-4 w-4 shrink-0 text-muted-foreground" />
          <h1 className="truncate text-sm font-semibold text-foreground">
            Vault
          </h1>
        </div>
      }
    />
  );
}
