// app/(authenticated)/applets/[applets]/[entity]/[field]/[pmid]/page.tsx
import { PMIDView } from "@/components/applet/pmid/PMIDView"

export default async function PMIDPage({
                                           params
                                       }: {
    params: { applet: string; entity: string; field: string; pmid: string }
}) {
    const { pmid } = params
    const data = await fetchDataForPmid(pmid)

    return <PMIDView pmid={pmid} data={data} />
}
