
// File: app/(auth-pages)/sign-up/hold-hold-page.tsx

import { signUpWithGoogleAction, signUpWithGithubAction } from "@/actions/auth.actions";
import { AuthMessageType } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { IconBrandGithub, IconBrandGoogle } from "@tabler/icons-react";
import AuthPageContainer from "@/components/auth/auth-page-container";
import { signup } from "../login/actions";


interface SignUpProps {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function SignUp({ searchParams }: SignUpProps) {

    console.log("SignUp page rendered");
    const awaitedSearchParams = await searchParams;
    console.log("Awaited search params:", awaitedSearchParams);

    const redirectTo = (awaitedSearchParams.redirectTo as string) || '/dashboard';
    const error = awaitedSearchParams.error as string;
    const success = awaitedSearchParams.success as string;

    let message: AuthMessageType | undefined;
    
    if (success) {
        message = {
            type: "success",
            message: success
        };
    } else if (error) {
        message = {
            type: "error",
            message: error
        };
    }

    console.log("Message:", message);

    return (
        <AuthPageContainer
            title="Create your account"
            subtitle={
                <>
                    Already have an account?{" "}
                    <Link className="font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500" href={`/login?redirectTo=${encodeURIComponent(redirectTo)}`}>
                        Sign in
                    </Link>
                </>
            }
            message={message as AuthMessageType}
        >
            <form action={signup} className="space-y-6" suppressHydrationWarning={true}>
                <div>
                    <Label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Full name
                    </Label>
                    <div className="mt-1" suppressHydrationWarning={true}>
                        <Input
                            id="name"
                            name="name"
                            type="text"
                            autoComplete="name"
                            required
                            className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-neutral-700 dark:text-white"
                            placeholder="John Doe"
                            data-lpignore="true"
                        />
                    </div>
                </div>

                <div>
                    <Label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Email address
                    </Label>
                    <div className="mt-1" suppressHydrationWarning={true}>
                        <Input
                            id="email"
                            name="email"
                            type="email"
                            autoComplete="email"
                            required
                            className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-neutral-700 dark:text-white"
                            placeholder="you@example.com"
                            data-lpignore="true"
                        />
                    </div>
                </div>

                <div>
                    <Label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Password
                    </Label>
                    <div className="mt-1" suppressHydrationWarning={true}>
                        <Input
                            id="password"
                            name="password"
                            type="password"
                            autoComplete="new-password"
                            required
                            className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-neutral-700 dark:text-white"
                            placeholder="••••••••"
                            data-lpignore="true"
                        />
                    </div>
                </div>

                <div>
                    <input 
                        id="redirectTo"
                        type="hidden" 
                        name="redirectTo" 
                        value={redirectTo} 
                    />
                    <SubmitButton pendingText="Creating Account..." className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200">
                        Sign up
                    </SubmitButton>
                </div>
            </form>

            <div className="mt-6">
                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-300 dark:border-gray-600" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-white dark:bg-neutral-800 text-gray-500 dark:text-gray-400">
                            Or continue with
                        </span>
                    </div>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3">
                    <form action={signUpWithGoogleAction} suppressHydrationWarning={true}>
                        <input 
                            id="redirectTo"
                            type="hidden" 
                            name="redirectTo" 
                            value={redirectTo} 
                        />
                        <SubmitButton pendingText="Connecting..." className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-neutral-700 text-sm font-medium text-gray-500 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-neutral-600 transition-colors duration-200">
                            <IconBrandGoogle className="h-5 w-5 mr-2" />
                            <span>Google</span>
                        </SubmitButton>
                    </form>

                    <form action={signUpWithGithubAction} suppressHydrationWarning={true}>
                        <input 
                            id="redirectTo"
                            type="hidden" 
                            name="redirectTo" 
                            value={redirectTo} 
                        />
                        <SubmitButton pendingText="Connecting..." className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-neutral-700 text-sm font-medium text-gray-500 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-neutral-600 transition-colors duration-200">
                            <IconBrandGithub className="h-5 w-5 mr-2" />
                            <span>GitHub</span>
                        </SubmitButton>
                    </form>
                </div>
            </div>
        </AuthPageContainer>
    );
}