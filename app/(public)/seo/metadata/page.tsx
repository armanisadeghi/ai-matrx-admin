import type { Metadata } from "next";
import { MetaInputWidget } from "./_components/MetaInputWidget";

export const metadata: Metadata = {
  title: "Meta Width Calculator — SEO Tools",
  description:
    "Calculate pixel widths and character counts for Google Search meta titles and descriptions with a live SERP preview. Updated for 2024.",
};

const GoogleLogo = ({ size = 28 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

export default function MetaCalculatorPage() {
  return (
    <div className="h-full overflow-y-auto bg-zinc-50 dark:bg-zinc-900">
      <header className="sticky top-0 z-10 bg-white dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <GoogleLogo size={26} />
          <div>
            <h1 className="text-zinc-900 dark:text-zinc-100 text-base font-semibold leading-tight tracking-tight">
              Meta Width Calculator
            </h1>
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-tight">
              SEO Tools · Pixel &amp; character limits for Google Search
            </p>
          </div>
        </div>
        <span className="text-xs text-zinc-400 dark:text-zinc-500 hidden sm:block">
          Updated 2024 · Google Sans · 13px descriptions
        </span>
      </header>

      <main className="max-w-[1400px] mx-auto px-4 py-6 xl:px-8 pb-12">
        <MetaInputWidget />
      </main>
    </div>
  );
}
