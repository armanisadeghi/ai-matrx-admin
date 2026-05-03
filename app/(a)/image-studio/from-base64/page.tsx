import Link from "next/link";
import { ArrowLeft, FileImage, Layers, Library, PartyPopper } from "lucide-react";
import FromBase64ShellClient from "./FromBase64ShellClient";

/**
 * /image-studio/from-base64
 *
 * Paste a base64 string (raw or full `data:` URL), preview the decoded image,
 * and save it to the cloud library with a persistent share URL.
 *
 * The shell is a Server Component (static SSR header + grid frame) wrapping a
 * `"use client"` body that runs the decoder + upload entirely in the browser.
 */
export default function FromBase64Page() {
  return (
    <div className="h-[calc(100dvh-2.5rem)] flex flex-col overflow-hidden bg-background">
      <header className="flex items-center justify-between gap-3 h-12 px-4 border-b border-border bg-card/40 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/image-studio"
            className="h-8 w-8 rounded-md hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            title="Back to Image Studio"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-sm font-semibold flex items-center gap-1.5 truncate">
              <PartyPopper className="h-3.5 w-3.5 text-primary" />
              Image Studio — From Base64
            </h1>
          </div>
        </div>
        <nav className="flex items-center gap-1 text-xs">
          <Link
            href="/image-studio/convert"
            className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <FileImage className="h-3.5 w-3.5" />
            Convert
          </Link>
          <Link
            href="/image-studio/presets"
            className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <Layers className="h-3.5 w-3.5" />
            Presets
          </Link>
          <Link
            href="/image-studio/library"
            className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <Library className="h-3.5 w-3.5" />
            Library
          </Link>
        </nav>
      </header>
      <div className="flex-1 min-h-0">
        <FromBase64ShellClient />
      </div>
    </div>
  );
}
