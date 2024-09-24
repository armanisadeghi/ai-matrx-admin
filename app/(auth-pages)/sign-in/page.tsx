// File: app/(auth-pages)/sign-in/page.tsx

import { signInAction, signInWithGoogleAction, signInWithGithubAction } from "@/app/actions";
import { FormMessage, Message } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";

export default function Login({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }) {
    console.log("Received searchParams:", searchParams); // Debug log
    const redirectTo = searchParams.redirectTo as string || '/dashboard';
    console.log("RedirectTo value:", redirectTo); // Debug log

    return (
        <div className="flex-1 flex flex-col min-w-64">
            <h1 className="text-2xl font-medium">Sign in</h1>
            <p className="text-sm text-foreground">
                Don't have an account?{" "}
                <Link className="text-foreground font-medium underline" href={`/sign-up?redirectTo=${encodeURIComponent(redirectTo)}`}>
                    Sign up
                </Link>
            </p>
            <div className="flex flex-col gap-2 [&>input]:mb-3 mt-8">
                <form action={signInAction}>
                    <Label htmlFor="email">Email</Label>
                    <Input name="email" placeholder="you@example.com" required />
                    <div className="flex justify-between items-center">
                        <Label htmlFor="password">Password</Label>
                        <Link
                            className="text-xs text-foreground underline"
                            href="/forgot-password"
                        >
                            Forgot Password?
                        </Link>
                    </div>
                    <Input
                        type="password"
                        name="password"
                        placeholder="Your password"
                        required
                    />
                    <input type="hidden" name="redirectTo" value={redirectTo} />
                    <SubmitButton pendingText="Signing In...">
                        Sign in with Email
                    </SubmitButton>
                </form>
                <div className="flex flex-col gap-2 mt-4">
                    <form action={signInWithGoogleAction}>
                        <input type="hidden" name="redirectTo" value={redirectTo} />
                        <SubmitButton pendingText="Connecting...">
                            Sign in with Google
                        </SubmitButton>
                    </form>
                    <form action={signInWithGithubAction}>
                        <input type="hidden" name="redirectTo" value={redirectTo} />
                        <SubmitButton pendingText="Connecting...">
                            Sign in with GitHub
                        </SubmitButton>
                    </form>
                </div>
                <FormMessage message={searchParams as Message} />
            </div>
        </div>
    );
}
