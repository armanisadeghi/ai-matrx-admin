// File: components/auth/auth-page-container.tsx

import React from 'react';
import MatrixLogo from "@/public/MatrixLogo";
import { FormMessage, Message } from "@/components/form-message";

interface AuthPageContainerProps {
    children: React.ReactNode;
    title: string;
    subtitle?: React.ReactNode;
    message?: Message;
}

export default function AuthPageContainer({ children, title, subtitle, message }: AuthPageContainerProps) {
    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 dark:from-neutral-900 dark:to-neutral-800 p-4">
            <div className="w-full max-w-md bg-white dark:bg-neutral-800 rounded-2xl shadow-[0_20px_50px_rgba(8,_112,_184,_0.7)] dark:shadow-[0_20px_50px_rgba(255,_255,_255,_0.2)] overflow-hidden transform transition-all hover:-translate-y-1 hover:shadow-[0_25px_60px_rgba(8,_112,_184,_0.8)] dark:hover:shadow-[0_25px_60px_rgba(255,_255,_255,_0.3)]">
                <div className="p-8">
                    <div className="flex justify-center">
                        <div className="transition-transform duration-300 ease-in-out hover:scale-110">
                            <MatrixLogo size="lg"/>
                        </div>
                    </div>
                    <h2 className="mt-6 text-3xl font-extrabold text-center text-gray-900 dark:text-white">
                        {title}
                    </h2>
                    {subtitle && (
                        <div className="mt-2 text-sm text-center text-gray-600 dark:text-gray-400">
                            {subtitle}
                        </div>
                    )}
                    <div className="mt-8">
                        {children}
                    </div>
                </div>
                {message && <FormMessage message={message} />}
            </div>
        </div>
    );
}
