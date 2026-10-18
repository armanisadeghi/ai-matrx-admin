"use client";

/**
 * Brand Identity → Builder. Renders nothing. While an admin has debug mode on it tells the Builder which brand
 * this page is (a `record` ref: the Provision tab then lists every capture whose subject is the brand) and which
 * provision points the brand guide and brand analysis steps read (`mandate` refs: the Provision tab then offers
 * one Capture button per point). Static names only; the values themselves are built on the server on demand.
 */
import { useEffect } from "react";
import { useBuilderFeed } from "@/hooks/useBuilderFeed";

export const BRAND_IDENTITY_SURFACE = "marketing.brands.identity";

const POINTS: Array<{ pointKey: string; label: string }> = [
  { pointKey: "brand_guide.voice", label: "voice inputs" },
  { pointKey: "brand_guide.messaging", label: "messaging inputs" },
  { pointKey: "brand_guide.audience", label: "audience inputs" },
  { pointKey: "brand_guide.words", label: "words inputs" },
  { pointKey: "brand_intake.smart_add_create", label: "brand analysis inputs" },
];

export function BrandIdentityBuilderFeed({
  brandId,
  brandName,
  organizationId,
}: {
  brandId: string;
  brandName: string;
  organizationId: string;
}) {
  const builder = useBuilderFeed(BRAND_IDENTITY_SURFACE);
  const { isActive, publish } = builder;
  useEffect(() => {
    if (!isActive) return;
    publish([
      {
        key: "brand",
        label: brandName,
        group: "inputs",
        data: { id: brandId, name: brandName, organization_id: organizationId },
        source: "page",
        ref: { type: "record", id: brandId, table: "web.brand", organizationId, label: brandName },
      },
      ...POINTS.map((p) => ({
        key: `provision.${p.pointKey}`,
        label: p.label,
        group: "provision" as const,
        data: { point_key: p.pointKey, subject_id: brandId },
        source: "page",
        ref: { type: "mandate" as const, provisionKey: p.pointKey, provisionLabel: p.label },
      })),
    ]);
  }, [isActive, publish, brandId, brandName, organizationId]);
  return null;
}
