import { Logo } from '@/components/branding/MatrixLogo';
import { CheckCircle } from 'lucide-react';

export default function OAuthSuccessPage() {
    return (
        <div className="min-h-dvh w-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-neutral-950 dark:to-neutral-900 p-4">
            <div className="w-full max-w-md">
                <div className="flex justify-center mb-6">
                    <Logo size="lg" variant="horizontal" linkEnabled={false} />
                </div>
                <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-lg dark:shadow-neutral-950/50 overflow-hidden border border-gray-200/60 dark:border-neutral-700/60 p-6 sm:p-8 text-center space-y-4">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
                        <CheckCircle className="h-6 w-6 text-emerald-500" />
                    </div>
                    <div className="space-y-1.5">
                        <h2 className="text-lg font-semibold text-foreground">
                            Authentication successful
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            You have been authenticated successfully. You can close this
                            tab and return to your application.
                        </p>
                    </div>
                </div>
                <p className="mt-3 text-center text-[11px] text-muted-foreground">
                    AI Matrx keeps your data secure.{' '}
                    <a
                        href="/privacy-policy"
                        className="underline underline-offset-2 hover:text-foreground transition-colors"
                    >
                        Privacy Policy
                    </a>
                </p>
            </div>
        </div>
    );
}
