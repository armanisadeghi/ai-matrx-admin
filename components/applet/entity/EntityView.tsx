// components/entity/EntityView.tsx
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card"
import Link from "next/link"

interface Field {
    id: number
    name: string
    displayName: string
}

export function EntityView(
    {
        applet,
        entity,
        fields
    }: {
        applet: string
        entity: string
        fields: Field[]
    }) {
    return (
        <div className="w-full space-y-4">
            <Card className="border-none shadow-none">
                <CardHeader className="px-2">
                    <CardTitle className="text-2xl font-semibold tracking-tight">
                        {entity}
                    </CardTitle>
                </CardHeader>
                <CardContent className="px-2">
                    <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {fields.map((field) => (
                            <li key={field.id}>
                                <Link
                                    href={`/applets/${applet}/${entity}/${field.name}`}
                                    className="block p-4 rounded-lg transition-colors hover:bg-accent"
                                >
                                    <span className="font-medium">{field.displayName}</span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                </CardContent>
            </Card>
        </div>
    )
}
