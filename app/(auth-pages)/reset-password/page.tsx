// File: app/(auth-pages)/reset-password/page.tsx

import { resetPasswordAction } from "@/actions/auth.actions";
import { Message } from "@/components/form-message";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/submit-button";
import AuthPageContainer from "@/components/auth/auth-page-container";

export default async function ResetPassword({
                                                searchParams,
                                            }: {
    searchParams: Message;
}) {
    return (
        <AuthPageContainer
            title="Reset password"
            subtitle="Please enter your new password below."
            message={searchParams}
        >
            <form action={resetPasswordAction} className="space-y-6">
                <div>
                    <Label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        New password
                    </Label>
                    <div className="mt-1">
                        <Input
                            id="password"
                            type="password"
                            name="password"
                            placeholder="New password"
                            required
                            className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-neutral-700 dark:text-white"
                        />
                    </div>
                </div>
                <div>
                    <Label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Confirm password
                    </Label>
                    <div className="mt-1">
                        <Input
                            id="confirmPassword"
                            type="password"
                            name="confirmPassword"
                            placeholder="Confirm password"
                            required
                            className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-neutral-700 dark:text-white"
                        />
                    </div>
                </div>
                <div>
                    <SubmitButton className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200">
                        Reset password
                    </SubmitButton>
                </div>
            </form>
        </AuthPageContainer>
    );
}
