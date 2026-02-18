"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Globe, Search, Zap, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useScraperSocket } from "@/lib/redux/socket-io/hooks/useScraperSocket";

export default function Page() {
    const router = useRouter();
    const { quickScrapeUrl } = useScraperSocket();
    const [url, setUrl] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [isFullScraping, setIsFullScraping] = useState(false);
    const [, startTransition] = useTransition();

    const validateUrl = (): boolean => {
        if (!url.trim()) {
            setError("Please enter a URL");
            return false;
        }
        try {
            new URL(url);
            return true;
        } catch {
            setError("Please enter a valid URL");
            return false;
        }
    };

    const handleQuickScrape = () => {
        if (!validateUrl()) return;
        setError(null);
        startTransition(() => {
            router.push(`/scraper/quick?url=${encodeURIComponent(url)}`);
        });
    };

    const handleFullScrape = async () => {
        if (!validateUrl()) return;
        setError(null);
        setIsFullScraping(true);
        try {
            const taskId = await quickScrapeUrl(url);
            startTransition(() => {
                router.push(`/scraper/${taskId}`);
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to start scraping");
        } finally {
            setIsFullScraping(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            handleQuickScrape();
        }
    };

    return (
        /*
         * Mobile keyboard strategy:
         * - h-dvh tracks the VISUAL viewport (shrinks when iOS keyboard opens)
         * - justify-start + pt-[30dvh] positions content ~30% from top when keyboard is closed
         * - When keyboard opens and dvh shrinks, content naturally stays near the top of the
         *   visible area rather than getting pushed off-screen or squeezed behind the keyboard
         * - overflow-y-auto allows scrolling if the keyboard pushes content too tight
         */
        <div className="h-dvh overflow-y-auto flex flex-col items-center justify-start pt-[28dvh] pb-safe bg-textured px-4">
            <div className="w-full max-w-2xl flex flex-col items-center gap-5">
                {/* Logo / Brand — hidden on mobile when keyboard is open (small screens) */}
                <div className="flex flex-col items-center gap-2 mb-1">
                    <Globe className="w-12 h-12 sm:w-14 sm:h-14 text-primary opacity-80" />
                    <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">Web Scraper</h1>
                    <p className="text-sm text-muted-foreground text-center hidden sm:block">
                        Extract content from any web page instantly
                    </p>
                </div>

                {/* Input — fontSize 16px prevents iOS auto-zoom on focus */}
                <div className="w-full">
                    <Input
                        type="url"
                        placeholder="Enter a URL to scrape..."
                        value={url}
                        onChange={(e) => {
                            setUrl(e.target.value);
                            if (error) setError(null);
                        }}
                        onKeyDown={handleKeyDown}
                        className="text-base h-12 rounded-full px-5 shadow-sm border-border/60 focus-visible:ring-primary/40"
                        style={{ fontSize: "16px" }}
                        inputMode="url"
                        autoComplete="url"
                    />
                    {error && (
                        <p className="text-xs text-destructive mt-2 text-center">{error}</p>
                    )}
                </div>

                {/* Action Buttons — full-width stack on mobile, side-by-side on desktop */}
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto sm:justify-center">
                    <Button
                        onClick={handleQuickScrape}
                        variant="secondary"
                        className="w-full sm:w-auto px-6 h-11 sm:h-10 rounded-full gap-2"
                    >
                        <Zap className="w-4 h-4" />
                        Quick Scrape
                    </Button>
                    <Button
                        onClick={handleFullScrape}
                        disabled={isFullScraping}
                        className="w-full sm:w-auto px-6 h-11 sm:h-10 rounded-full gap-2"
                    >
                        {isFullScraping ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Search className="w-4 h-4" />
                        )}
                        Full Scrape
                    </Button>
                </div>

                {/* Helper text — hidden on mobile to save vertical space */}
                <p className="text-xs text-muted-foreground text-center max-w-md hidden sm:block">
                    <span className="font-medium">Quick Scrape</span> extracts plain text instantly.{" "}
                    <span className="font-medium">Full Scrape</span> captures structured data, images, links & metadata.
                </p>
            </div>
        </div>
    );
}
