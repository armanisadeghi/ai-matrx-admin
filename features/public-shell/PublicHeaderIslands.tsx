"use client";

// The header's right-hand islands. Light tier: store-free theme toggle, a canvas button that loads
// the full tree and opens the canvas, and the Sign In button (the server already knows this visitor
// is signed out). Full tier: the Redux islands from PublicHeaderFullIslands, unchanged.

import { useRouter } from "next/navigation";
import { LogIn, Moon, PanelRight, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useIsMounted } from "@ai-matrx/kit/hooks";
import { useLoginHref } from "@/hooks/auth/useLoginHref";
import { useThemeMode } from "@/styles/themes/useThemeMode";
import { PUBLIC_HEADER_ICON_BUTTON } from "@/components/matrx/publicHeaderChrome";
import { usePublicTier } from "./publicTier";

function LightThemeToggle() {
  const theme = useThemeMode();
  const mounted = useIsMounted();
  if (!mounted) return <div className={PUBLIC_HEADER_ICON_BUTTON} aria-hidden="true" />;
  const next = theme === "dark" ? "light" : "dark";
  return (
    <Button
      icon={theme === "dark" ? <Sun className="text-zinc-600 dark:text-zinc-400" /> : <Moon className="text-zinc-600 dark:text-zinc-400" />}
      variant="quiet"
      onClick={() => {
        void import("./publicThemeWrite")
          .then((m) => m.writePublicThemeChoice(next))
          .catch((error: unknown) => console.warn("[public-header] theme switch did not load", error));
      }}
      className={PUBLIC_HEADER_ICON_BUTTON}
      aria-label={`Switch to ${next} theme`}
    />
  );
}

export function PublicHeaderIslands() {
  const tier = usePublicTier();
  const router = useRouter();
  const loginHref = useLoginHref();
  if (tier.FullIslands) return <tier.FullIslands />;
  return (
    <>
      <LightThemeToggle />
      <Button
        icon={<PanelRight />}
        variant="quiet"
        className={PUBLIC_HEADER_ICON_BUTTON}
        aria-label="Show canvas"
        onClick={() => tier.requestFull({ openCanvas: true })}
      />
      <Button
        icon={<LogIn />}
        variant="primary"
        onClick={() => router.push(loginHref)}
        aria-label="Sign in"
        className={cn(PUBLIC_HEADER_ICON_BUTTON, "sm:w-auto")}
      >
        <span className="hidden sm:inline">Sign In</span>
      </Button>
    </>
  );
}
