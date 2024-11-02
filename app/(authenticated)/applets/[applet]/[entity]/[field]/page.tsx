// app/(authenticated)/applets/[applets]/[entity]/[field]/page.tsx
import {FieldView} from "@/components/applet/field/FieldView"

export default async function FieldPage(
    {
        params
    }: {
        params: { applet: string; entity: string; field: string }
    }) {
    const {applet, entity, field} = params
    const pmids = await fetchPmidsForField(field)

    return <FieldView
        applet={applet}
        entity={entity}
        field={field}
        pmids={pmids}
    />
}

