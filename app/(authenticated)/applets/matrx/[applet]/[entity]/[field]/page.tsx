// app/(authenticated)/applets/[applets]/[entity]/[field]/page.tsx
import {FieldView} from "@/components/applet/field/FieldView"

export default async function FieldPage(
    {
        params
    }: {
        params: Promise<{ applet: string; entity: string; field: string }>
    }) {
    const {applet, entity, field} = await params
    
    // TODO: Implement fetchPmidsForField to retrieve actual PMIDs for this field
    const pmids: number[] = []

    return <FieldView
        applet={applet}
        entity={entity}
        field={field}
        pmids={pmids}
    />
}

