// features/sharing/public-view/PublicViewLocked.tsx — THE PASSWORD PAGE OF A PROTECTED VIEW LINK.
//
// Server-rendered, no client code: a plain form that posts to `/v/<token>/unlock`. It names nothing about the view, so a
// stranger holding only the link learns only that a password is needed. A wrong password says so and nothing else.

import { Button } from "@ai-matrx/design-system";

export function PublicViewLocked({ token, wrong }: { token: string; wrong: boolean }) {
  return (
    <main className="matrx-touch-targets mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-3 px-5 pb-safe pt-8">
      <h1 className="text-xl font-medium">Password needed</h1>
      <form method="post" action={`/v/${token}/unlock`} className="flex flex-col gap-2" data-view-link-unlock="">
        {/* ui-exception: a secret typed once, not writing; the platform's writing box has no place on a signed-out gate */}
        <input
          type="password"
          name="password"
          required
          autoFocus
          autoComplete="off"
          aria-label="Password"
          aria-invalid={wrong}
          className="h-10 rounded-md border border-border bg-card px-3 text-base"
        />
        <p role="alert" className="min-h-5 text-sm text-destructive" data-view-link-wrong="">
          {wrong ? "That password is not right." : ""}
        </p>
        <Button type="submit" variant="primary">
          Open
        </Button>
      </form>
    </main>
  );
}
