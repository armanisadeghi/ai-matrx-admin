// File: app/(auth-pages)/forgot-password/hold-hold-page.tsx

import {forgotPasswordAction} from "@/actions/auth.actions";
import {Message} from "@/components/form-message";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import Link from "next/link";
import {SubmitButton} from "@/components/submit-button";
import AuthPageContainer from "@/components/auth/auth-page-container";

type PageProps = {
    searchParams: {
        success: string;
    }
}

export default function ForgotPassword(
    {
        searchParams,
    }: {
        searchParams: Message;
    }) {
    return (
        <AuthPageContainer
            title="Reset Password"
            subtitle={
                <>
                    Enter your email to reset your password.{" "}
                    <Link className="text-blue-600 dark:text-blue-400 hover:text-blue-500 underline" href="/sign-in">
                        Back to Sign in
                    </Link>
                </>
            }
            message={searchParams}
        >
            <form action={forgotPasswordAction} className="space-y-6">
                <div>
                    <Label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Email address
                    </Label>
                    <div className="mt-1">
                        <Input
                            id="email"
                            name="email"
                            type="email"
                            autoComplete="email"
                            required
                            placeholder="you@example.com"
                            className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-neutral-700 dark:text-white"
                        />
                    </div>
                </div>
                <div>
                    <SubmitButton
                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200">
                        Reset Password
                    </SubmitButton>
                </div>
            </form>
        </AuthPageContainer>
    );
}
