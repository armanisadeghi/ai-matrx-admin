import Link from 'next/link';

export default function SpeakerButtonRedirectPage() {
  return (
    <div className="h-full flex items-center justify-center bg-textured">
      <div className="text-center space-y-3 px-4">
        <h1 className="text-xl font-bold">Speaker Button Demo</h1>
        <p className="text-sm text-muted-foreground max-w-md">
          The TTS components use the glass design system which requires the SSR shell.
        </p>
        <Link
          href="/ssr/demos/speaker-demo"
          className="inline-block px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          Go to demo
        </Link>
      </div>
    </div>
  );
}
