// File: app/(auth-pages)/sign-out/page.tsx

import { signOutAction } from "@/actions/auth.actions";
import { Message } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import AuthPageContainer from "@/components/auth/auth-page-container";
import Link from "next/link";

export default function SignOut({
                                    searchParams,
                                }: {
    searchParams: Message;
}) {
    return (
        <AuthPageContainer
            title="Sign Out"
            subtitle="Are you sure you want to sign out?"
            message={searchParams}
        >
            <div className="space-y-6">
                <p className="text-center text-gray-600 dark:text-gray-400">
                    You're about to sign out of your account. You can always sign back in anytime.
                </p>
                <form action={signOutAction} className="space-y-4">
                    <SubmitButton className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-200">
                        Sign Out
                    </SubmitButton>
                </form>
                <div className="text-center">
                    <Link href="/dashboard" className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-500">
                        Cancel and return to dashboard
                    </Link>
                </div>
            </div>
        </AuthPageContainer>
    );
}
