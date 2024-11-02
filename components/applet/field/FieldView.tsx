// components/field/FieldView.tsx
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card"
import Link from "next/link"

export function FieldView(
    {
        applet,
        entity,
        field,
        pmids
    }: {
        applet: string
        entity: string
        field: string
        pmids: number[]
    }) {
    return (
        <div className="w-full space-y-4">
            <Card className="border-none shadow-none">
                <CardHeader className="px-2">
                    <CardTitle className="text-2xl font-semibold tracking-tight">
                        {field}
                    </CardTitle>
                </CardHeader>
                <CardContent className="px-2">
                    <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {pmids.map((pmid) => (
                            <li key={pmid}>
                                <Link
                                    href={`/applets/${applet}/${entity}/${field}/${pmid}`}
                                    className="block p-4 rounded-lg transition-colors hover:bg-accent"
                                >
                                    <span className="font-medium">PMID: {pmid}</span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                </CardContent>
            </Card>
        </div>
    )
}
