import Link from "next/link";
import { ArrowLeft, Layers, Library, Sparkles } from "lucide-react";
import ImageStudioShellClient from "./ImageStudioShellClient";

/**
 * /image-studio/convert
 *
 * The interactive tool. Server component shell provides a fixed header and
 * the three-column frame. The interactive body (`ImageStudioShell`) is
 * dynamically imported on the client with ssr:false so there's no
 * server/client mismatch around FileReader/URL.createObjectURL/react-dropzone.
 */

export default function ConvertPage() {
  return (
    <div className="h-[calc(100dvh-2.5rem)] flex flex-col overflow-hidden bg-background">
      {/* Static SSR header */}
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
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Image Studio — Convert
            </h1>
          </div>
        </div>
        <nav className="flex items-center gap-1 text-xs">
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

      {/* Dynamic interactive body */}
      <div className="flex-1 min-h-0">
        <ImageStudioShellClient defaultFolder="image-studio" />
      </div>
    </div>
  );
}
