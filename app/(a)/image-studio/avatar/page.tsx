import Link from "next/link";
import {
  ArrowLeft,
  Braces,
  FileImage,
  Layers,
  Library,
  Sparkles,
  UserCircle,
} from "lucide-react";
import AvatarShellClient from "./AvatarShellClient";

interface PageProps {
  searchParams: Promise<{
    url?: string;
    cloudFileId?: string;
    folder?: string;
  }>;
}

export default async function AvatarPage({ searchParams }: PageProps) {
  const params = await searchParams;
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
              <UserCircle className="h-3.5 w-3.5 text-primary" />
              Image Studio — Avatar
            </h1>
          </div>
        </div>
        <nav className="flex items-center gap-1 text-xs">
          <Link
            href="/image-studio/edit"
            className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Edit
          </Link>
          <Link
            href="/image-studio/annotate"
            className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Annotate
          </Link>
          <Link
            href="/image-studio/convert"
            className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <FileImage className="h-3.5 w-3.5" />
            Convert
          </Link>
          <Link
            href="/image-studio/from-base64"
            className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <Braces className="h-3.5 w-3.5" />
            Base64
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
        <AvatarShellClient
          urlParam={params.url ?? null}
          cloudFileId={params.cloudFileId ?? null}
          folder={params.folder}
        />
      </div>
    </div>
  );
}
