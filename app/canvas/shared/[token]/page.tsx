"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { canvasItemsService, type CanvasItemRow } from "@/services/canvasItemsService";
import { CanvasRenderer } from "@/components/layout/adaptive-layout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertCircle, Loader2, Copy, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

/**
 * Shared Canvas Page
 * 
 * Public page for viewing shared canvas items via share token.
 * No authentication required - accessible to anyone with the link.
 */
export default function SharedCanvasPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [item, setItem] = useState<CanvasItemRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadSharedItem();
  }, [token]);

  const loadSharedItem = async () => {
    setIsLoading(true);
    setError(null);

    const { data, error: loadError } = await canvasItemsService.getShared(token);

    if (loadError || !data) {
      setError(loadError?.message || "Failed to load shared item");
    } else {
      setItem(data);
    }

    setIsLoading(false);
  };

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    toast.success("Link copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-zinc-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 dark:text-blue-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading shared canvas...</p>
        </div>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-zinc-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-zinc-900 rounded-xl shadow-lg p-8 text-center border border-zinc-200 dark:border-zinc-800">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Canvas Not Found
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            This shared canvas doesn't exist or is no longer available.
          </p>
          <Button
            onClick={() => router.push("/")}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-zinc-900 flex flex-col">
      {/* Header Banner */}
      <div className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
                {item.title || "Untitled Canvas"}
              </h1>
              <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                Shared
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Shared {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
              {item.description && ` • ${item.description}`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
              className="gap-2"
            >
              {copied ? (
                <>
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy Link
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/")}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Home
            </Button>
          </div>
        </div>
      </div>

      {/* Canvas Content - Full Screen */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full max-w-7xl mx-auto">
          <div className="h-full bg-white dark:bg-zinc-900 shadow-xl border-x border-zinc-200 dark:border-zinc-800">
            <CanvasRenderer content={item.content} />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 py-3">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs text-gray-500 dark:text-gray-400">
          Powered by AI Matrx • This canvas is publicly shared
        </div>
      </div>
    </div>
  );
}

