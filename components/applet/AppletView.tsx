// components/applets/AppletView.tsx
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card"
import Link from "next/link"

interface Entity {
    id: number
    name: string
    displayName: string
}

export function AppletView(
    {
        applet,
        entities
    }: {
        applet: string
        entities: Entity[]
    }) {
    return (
        <div className="w-full space-y-4">
            <Card className="border-none shadow-none">
                <CardHeader className="px-2">
                    <CardTitle className="text-2xl font-semibold tracking-tight">
                        {applet}
                    </CardTitle>
                </CardHeader>
                <CardContent className="px-2">
                    <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {entities.map((entity) => (
                            <li key={entity.id}>
                                <Link
                                    href={`/applets/${applet}/${entity.name}`}
                                    className="block p-4 rounded-lg transition-colors hover:bg-accent"
                                >
                                    <span className="font-medium">{entity.displayName}</span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                </CardContent>
            </Card>
        </div>
    )
}
