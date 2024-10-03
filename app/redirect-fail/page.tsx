// app/redirect-fail/page.tsx

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';

export default function AuthRedirectPage({
                                             searchParams,
                                         }: {
    searchParams: { [key: string]: string | string[] | undefined }
}) {
    const params = Object.entries(searchParams)
        .map(([key, value]) => `${key}: ${value}`)
        .join('\n');

    return (
        <div className="container mx-auto p-4 max-w-2xl">
            <Alert variant="destructive" className="mb-4">
                <AlertTitle>Authentication Error</AlertTitle>
                <AlertDescription>Auth redirect did not work</AlertDescription>
            </Alert>

            <h2 className="text-lg font-semibold mb-2">URL Parameters:</h2>
            <Textarea
                value={params}
                readOnly
                className="w-full h-40"
                placeholder="No URL parameters found"
            />
        </div>
    );
}
