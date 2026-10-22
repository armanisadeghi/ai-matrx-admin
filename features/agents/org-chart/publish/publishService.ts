// features/agents/org-chart/publish/publishService.ts — the one read/write path for published org
// charts (agent.org_chart_publication), signed-in side.
//
// A publication is the publisher's own record in the active organization (every write names it).
// Publishing is the row's own `published_to_web` lane — the canonical anonymous lane; turning it off
// takes the page down at once. Republishing replaces the snapshot and text in place, so the address
// never changes. The public page reads through `publicRead.ts`.

"use client";

import { supabase } from "@/utils/supabase/client";
import { requireUserId } from "@/utils/auth/getUserId";
import { ensureOrgId } from "@/lib/organizations/ensureOrgId";
import type { Json } from "@/types/database.types";

import { slugify, type OrgChartSnapshot } from "./snapshot";

export interface OrgChartPublication {
  id: string;
  slug: string;
  title: string;
  blurb: string | null;
  rootBoxId: string | null;
  published: boolean;
  updatedAt: string;
}

interface Row {
  id: string;
  slug: string;
  title: string;
  blurb: string | null;
  root_box_id: string | null;
  published_to_web: boolean;
  updated_at: string;
}

const COLUMNS = "id, slug, title, blurb, root_box_id, published_to_web, updated_at";
const table = () => supabase.schema("agent").from("org_chart_publication");

const fromRow = (r: Row): OrgChartPublication => ({
  id: r.id,
  slug: r.slug,
  title: r.title,
  blurb: r.blurb,
  rootBoxId: r.root_box_id,
  published: r.published_to_web,
  updatedAt: r.updated_at,
});

/** The public address of a publication. */
export function publicationPath(slug: string): string {
  return `/chart/${slug}`;
}

export interface PublishInput {
  title: string;
  slug: string;
  blurb: string | null;
  /** The branch's top box id, or null for the whole chart. */
  rootBoxId: string | null;
  snapshot: OrgChartSnapshot;
  /** The publisher's name as shown on the page ("Made by …"); never an email. */
  creatorName: string | null;
}

export const orgChartPublishService = {
  /** The viewer's own publication of this chart or branch, if they made one. */
  async findMine(rootBoxId: string | null): Promise<OrgChartPublication | null> {
    let q = table().select(COLUMNS).eq("created_by", requireUserId()).is("deleted_at", null);
    q = rootBoxId ? q.eq("root_box_id", rootBoxId) : q.is("root_box_id", null);
    const { data, error } = await q.order("updated_at", { ascending: false }).limit(1).maybeSingle();
    if (error) throw new Error(error.message);
    return data ? fromRow(data as Row) : null;
  },

  /** Publishes a new page. A taken address gets the next free number appended. */
  async publish(input: PublishInput): Promise<OrgChartPublication> {
    const organizationId = await ensureOrgId(null);
    const createdBy = requireUserId();
    const base = slugify(input.slug || input.title);
    for (let attempt = 1; attempt <= 6; attempt++) {
      const slug = attempt === 1 ? base : `${base.slice(0, 74)}-${attempt}`;
      const { data, error } = await table()
        .insert({
          organization_id: organizationId,
          created_by: createdBy,
          slug,
          title: input.title.trim(),
          blurb: input.blurb?.trim() || null,
          root_box_id: input.rootBoxId,
          snapshot: input.snapshot as unknown as Json,
          creator_name: input.creatorName,
          published_to_web: true,
        })
        .select(COLUMNS)
        .single();
      if (!error) return fromRow(data as Row);
      if (error.code !== "23505") throw new Error(error.message);
    }
    throw new Error("That address is taken. Try another.");
  },

  /** Republishes in place: new snapshot and text, same address unless the slug was changed. */
  async update(id: string, input: PublishInput): Promise<OrgChartPublication> {
    const { data, error } = await table()
      .update({
        slug: slugify(input.slug || input.title),
        title: input.title.trim(),
        blurb: input.blurb?.trim() || null,
        snapshot: input.snapshot as unknown as Json,
        creator_name: input.creatorName,
        published_to_web: true,
      })
      .eq("id", id)
      .select(COLUMNS)
      .maybeSingle();
    if (error) {
      throw new Error(error.code === "23505" ? "That address is taken. Try another." : error.message);
    }
    if (!data) throw new Error("This page could not be updated — it may have been removed.");
    return fromRow(data as Row);
  },

  /** Takes the page off the web. The record stays, so publishing again keeps its address. */
  async unpublish(id: string): Promise<OrgChartPublication> {
    const { data, error } = await table().update({ published_to_web: false }).eq("id", id).select(COLUMNS).maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("This page could not be taken down — it may have been removed.");
    return fromRow(data as Row);
  },
};
