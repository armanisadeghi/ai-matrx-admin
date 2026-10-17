import { ImageResponse } from "next/og";

import { getSharedComparison } from "@/features/comparison/public/fetch.server";
import { comparedItems, verdictOf } from "@/features/comparison/verdict";

// The social card of a shared comparison: the contenders in rank order with the leader's number on the
// primary measure. Built from the public payload alone.
export const runtime = "nodejs";
export const alt = "A comparison on AI Matrx";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const shared = await getSharedComparison(slug);
  const result = shared?.result ?? null;
  const items = result ? comparedItems(result).slice(0, 4) : [];
  const primary = result?.fields.find((f) => f.is_primary) ?? null;
  const leader = result ? verdictOf(result).leader : null;
  return new ImageResponse(
    (
      <div style={{ display: "flex", flexDirection: "column", width: "1200px", height: "630px", padding: "64px", color: "white",
        background: "linear-gradient(135deg, #071126 0%, #111b3c 55%, #31205f 100%)", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ display: "flex", fontSize: 24, opacity: 0.8 }}>{shared?.kindLabel ?? "Comparison"}{primary ? ` · ${primary.label}` : ""}</div>
        <div style={{ display: "flex", fontSize: 56, fontWeight: 700, marginTop: 20, lineHeight: 1.1 }}>
          {shared?.title ?? "A comparison on AI Matrx"}
        </div>
        <div style={{ display: "flex", flexDirection: "column", marginTop: "auto", gap: 10 }}>
          {items.map((i) => (
            <div key={i.item_id} style={{ display: "flex", justifyContent: "space-between", fontSize: 32, borderTop: "1px solid #ffffff33", paddingTop: 10 }}>
              <span style={{ display: "flex" }}>{`${i.rank}. ${i.name}`}</span>
              <span style={{ display: "flex", fontWeight: leader?.item_id === i.item_id ? 700 : 400 }}>
                {primary ? i.values[primary.key]?.display ?? "" : ""}
              </span>
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
