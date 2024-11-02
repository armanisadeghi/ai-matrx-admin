// components/pmid/PMIDView.tsx
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card"

export function PMIDView(
    {
        pmid,
        data
    }: {
        pmid: string
        data: Record<string, unknown>
    }) {
    return (
        <div className="w-full space-y-4">
            <Card className="border-none shadow-none">
                <CardHeader className="px-2">
                    <CardTitle className="text-2xl font-semibold tracking-tight">
                        PMID: {pmid}
                    </CardTitle>
                </CardHeader>
                <CardContent className="px-2">
          <pre className="p-4 rounded-lg bg-muted font-mono text-sm">
            {JSON.stringify(data, null, 2)}
          </pre>
                </CardContent>
            </Card>
        </div>
    )
}
