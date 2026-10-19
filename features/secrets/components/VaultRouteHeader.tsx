"use client";

/**
 * Header for /vault and /vault/authenticator. The Vault workspace
 * (`@ai-matrx/vault`) owns its search, vault switcher and add actions; the
 * header carries the Vault's name and its two doors people look for by name:
 * the Authenticator (one press at every width, as the old Vault had) and the
 * browsers that fill.
 */
import { Globe, KeyRound, ShieldCheck } from "lucide-react";
import { TapTargetButton } from "@ai-matrx/design-system/tap-target";
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
      right={
        <div className="flex items-center">
          <TapTargetButton
            href="/vault?panel=devices"
            icon={<Globe className="h-4 w-4" />}
            label="Browsers"
          />
          <TapTargetButton
            href="/vault/authenticator"
            icon={<KeyRound className="h-4 w-4" />}
            label="Authenticator"
          />
        </div>
      }
    />
  );
}
