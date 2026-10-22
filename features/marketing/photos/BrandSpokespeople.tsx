"use client";

/**
 * The brand's key people (founders / key people linked as `platform.associations` party -> web_brand) with a
 * Spokesperson switch (`metadata.is_spokesperson`, what aidream's brand reader flags) and their photos
 * (`SubjectPhotosDialog`, stored as brand `headshot` assets linked by `data.party_id`). A video clone with a generated
 * presenter uses a spokesperson's photos when the brief gives none.
 */

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/lib/toast";
import { extractErrorMessage } from "@/utils/errors";
import { supabase } from "@/utils/supabase/client";
import { associationsService } from "@/features/scopes/service/associationsService";
import { SectionCard } from "@/features/marketing/components/shared/MarketingUi";
import type { MarketingBrand } from "@/features/marketing/types";
import { photosOf } from "./subject-photos";
import { SubjectPhotosDialog } from "./SubjectPhotosDialog";
import { listBrandAssets } from "@/features/marketing/data/service";

import { brandPeopleKey, setSpokespersonEdge, type Person } from "./spokespeople";

const KEY_PERSON_ROLES = ["key_person", "owns"];

async function listPeople(brandId: string): Promise<Person[]> {
  const res = await associationsService.listForTargets("web_brand", [brandId]);
  if (!res.ok) throw new Error(res.error.message);
  const edges = res.data.edges.filter((e) => e.sourceType === "party" && e.role && KEY_PERSON_ROLES.includes(e.role));
  if (!edges.length) return [];
  const { data, error } = await supabase
    .schema("crm")
    .from("party")
    .select("id, display_name")
    .in("id", edges.map((e) => e.sourceId));
  if (error) throw new Error(error.message);
  const names = new Map((data ?? []).map((p) => [p.id, p.display_name as string]));
  return edges.map((e) => ({
    partyId: e.sourceId,
    name: names.get(e.sourceId) ?? "Person",
    role: e.role as string,
    metadata: e.metadata && typeof e.metadata === "object" && !Array.isArray(e.metadata) ? (e.metadata as Record<string, unknown>) : {},
  }));
}

export function BrandSpokespeople({ brand, canEdit }: { brand: MarketingBrand; canEdit: boolean }) {
  const qc = useQueryClient();
  const people = useQuery({ queryKey: brandPeopleKey(brand.id), queryFn: () => listPeople(brand.id) });
  const assets = useQuery({
    queryKey: ["marketing", "subject-photos", brand.id, "all"],
    queryFn: ({ signal }) => listBrandAssets(brand.id, signal),
  });
  const [photosFor, setPhotosFor] = useState<Person | null>(null);
  if (!people.data?.length) return null;

  const setSpokesperson = async (p: Person, on: boolean) => {
    try {
      await setSpokespersonEdge(brand, p, on);
      await qc.invalidateQueries({ queryKey: brandPeopleKey(brand.id) });
    } catch (e) {
      toast.error("Could not change spokesperson", { description: extractErrorMessage(e) });
    }
  };

  return (
    <SectionCard title="Spokespeople">
      <ul className="flex flex-col gap-1" data-brand-spokespeople={brand.id}>
        {people.data.map((p) => {
          const count = photosOf(assets.data ?? [], { brandId: brand.id, organizationId: brand.organization_id, kind: "person", id: p.partyId }).length;
          return (
            <li key={p.partyId} className="flex items-center gap-3 rounded-md px-1.5 py-1 hover:bg-muted/50">
              <span className="min-w-0 flex-1 truncate text-sm">{p.name}</span>
              <label className="flex items-center gap-2 text-sm">
                Spokesperson
                <Switch
                  checked={p.metadata.is_spokesperson === true}
                  disabled={!canEdit}
                  aria-label={`${p.name} is a spokesperson`}
                  onCheckedChange={(on) => void setSpokesperson(p, on)}
                />
              </label>
              <Button variant="outline" disabled={!canEdit && count === 0} data-person-photos={p.partyId} onClick={() => setPhotosFor(p)}>
                {count ? `${count} photo${count === 1 ? "" : "s"}` : "Add photos"}
              </Button>
            </li>
          );
        })}
      </ul>
      {photosFor ? (
        <SubjectPhotosDialog
          open
          onOpenChange={(o) => !o && setPhotosFor(null)}
          name={photosFor.name}
          subject={{ brandId: brand.id, organizationId: brand.organization_id, kind: "person", id: photosFor.partyId }}
        />
      ) : null}
    </SectionCard>
  );
}
