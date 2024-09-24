// File: app/(auth-pages)/sign-up/page.tsx

import { signUpAction, signInWithGoogleAction, signInWithGithubAction } from "@/app/actions";
import { FormMessage, Message } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { SmtpMessage } from "../smtp-message";

export default function Signup({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }) {
    const redirectTo = searchParams.redirectTo as string || '/dashboard';

    if ("message" in searchParams) {
        return (
            <div className="w-full flex-1 flex items-center h-screen sm:max-w-md justify-center gap-2 p-4">
                <FormMessage message={searchParams as Message} />
            </div>
        );
    }

    return (
        <>
            <div className="flex flex-col min-w-64 max-w-64 mx-auto">
                <h1 className="text-2xl font-medium">Sign up</h1>
                <p className="text-sm text text-foreground">
                    Already have an account?{" "}
                    <Link className="text-primary font-medium underline" href={`/sign-in?redirectTo=${encodeURIComponent(redirectTo)}`}>
                        Sign in
                    </Link>
                </p>
                <div className="flex flex-col gap-2 [&>input]:mb-3 mt-8">
                    <form action={signUpAction}>
                        <Label htmlFor="email">Email</Label>
                        <Input name="email" placeholder="you@example.com" required />
                        <Label htmlFor="password">Password</Label>
                        <Input
                            type="password"
                            name="password"
                            placeholder="Your password"
                            minLength={6}
                            required
                        />
                        <input type="hidden" name="redirectTo" value={redirectTo} />
                        <SubmitButton pendingText="Signing up...">
                            Sign up with Email
                        </SubmitButton>
                    </form>
                    <div className="flex flex-col gap-2 mt-4">
                        <form action={signInWithGoogleAction}>
                            <input type="hidden" name="redirectTo" value={redirectTo} />
                            <SubmitButton pendingText="Connecting...">
                                Sign up with Google
                            </SubmitButton>
                        </form>
                        <form action={signInWithGithubAction}>
                            <input type="hidden" name="redirectTo" value={redirectTo} />
                            <SubmitButton pendingText="Connecting...">
                                Sign up with GitHub
                            </SubmitButton>
                        </form>
                    </div>
                    <FormMessage message={searchParams as Message} />
                </div>
            </div>
            <SmtpMessage />
        </>
    );
}
