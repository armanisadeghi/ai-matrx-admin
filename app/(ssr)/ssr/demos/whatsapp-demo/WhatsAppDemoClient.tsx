"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Database, FlaskConical } from "lucide-react";
import { cn } from "@/styles/themes/utils";
import {
  WhatsAppDataModeProvider,
  type WADataMode,
} from "@/features/whatsapp-clone/hooks/WhatsAppDataModeProvider";
import { WhatsAppShell } from "@/features/whatsapp-clone/shell/WhatsAppShell";

interface WhatsAppDemoClientProps {
  initialMode: WADataMode;
  userName?: string;
  userAvatarUrl?: string | null;
}

export function WhatsAppDemoClient({
  initialMode,
  userName,
  userAvatarUrl,
}: WhatsAppDemoClientProps) {
  const router = useRouter();
  const params = useSearchParams();
  const [mode, setMode] = useState<WADataMode>(initialMode);

  const flip = () => {
    const next: WADataMode = mode === "mock" ? "live" : "mock";
    setMode(next);
    const usp = new URLSearchParams(params?.toString() ?? "");
    usp.set("mock", next === "mock" ? "1" : "0");
    router.replace(`?${usp.toString()}`, { scroll: false });
  };

  return (
    <div
      className="relative h-dvh w-full"
      style={{
        background: "linear-gradient(135deg,#161b22 0%,#0b141a 60%,#161b22 100%)",
      }}
    >
      <div className="mx-auto h-full max-w-[1480px]">
        <WhatsAppDataModeProvider initialMode={mode} key={mode}>
          <WhatsAppShell userName={userName} userAvatarUrl={userAvatarUrl} />
        </WhatsAppDataModeProvider>
      </div>

      <button
        type="button"
        onClick={flip}
        className={cn(
          "fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full px-3 py-2 text-[12px] font-medium shadow-lg transition-colors",
          mode === "mock"
            ? "bg-[#202c33] text-[#aebac1] hover:bg-[#2a3942]"
            : "bg-[#25d366] text-[#0b141a] hover:bg-[#1fb556]",
        )}
        aria-label={`Switch to ${mode === "mock" ? "live" : "mock"} data`}
      >
        {mode === "mock" ? (
          <>
            <FlaskConical className="h-3.5 w-3.5" />
            Mock data
          </>
        ) : (
          <>
            <Database className="h-3.5 w-3.5" />
            Live data
          </>
        )}
      </button>
    </div>
  );
}
