import "server-only";

import { cache } from "react";
import { createClient } from "@/utils/supabase/server";
import { getPresetById } from "../presets";

const DEFAULT_BUCKET = "userContent";
const STUDIO_ROOT = "image-studio";

export interface LibraryVariant {
    name: string;
    path: string;
    publicUrl: string;
    size: number;
    updatedAt: string | null;
    /** Guessed preset id from the filename ("foo-avatar-md.jpg" → "avatar-md"). */
    presetId: string | null;
    presetName: string | null;
    mimeType: string | null;
    width: number | null;
    height: number | null;
}

export interface LibrarySession {
    id: string;
    /** Full path segment under the user folder (e.g. "image-studio/abc-123"). */
    folder: string;
    updatedAt: string | null;
    variants: LibraryVariant[];
}

export interface LibrarySnapshot {
    bucket: string;
    userId: string | null;
    sessions: LibrarySession[];
    totalVariants: number;
    totalBytes: number;
}

function guessPresetIdFromFilename(filename: string): string | null {
    // Files written by save route look like: `<base>-<presetId>.<ext>` where
    // the presetId may itself contain dashes (e.g. "android-chrome-192").
    // Strategy: strip the extension, then match against known preset ids.
    const name = filename.replace(/\.[^.]+$/, "");
    // The safest way: check every known preset id as a suffix.
    const tokens = name.split("-");
    for (let start = 0; start < tokens.length; start++) {
        const candidate = tokens.slice(start).join("-");
        if (getPresetById(candidate)) return candidate;
    }
    return null;
}

function guessMime(filename: string): string | null {
    const ext = filename.split(".").pop()?.toLowerCase();
    switch (ext) {
        case "jpg":
        case "jpeg":
            return "image/jpeg";
        case "png":
            return "image/png";
        case "webp":
            return "image/webp";
        case "avif":
            return "image/avif";
        case "gif":
            return "image/gif";
        default:
            return null;
    }
}

/**
 * Server-only fetcher for the current user's Image Studio library.
 *
 * `cache()` memoises per request so layout + page + generateMetadata could
 * all call this safely.
 */
export const getUserStudioLibrary = cache(
    async (): Promise<LibrarySnapshot> => {
        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const bucket = DEFAULT_BUCKET;

        if (!user || !supabaseUrl) {
            return {
                bucket,
                userId: user?.id ?? null,
                sessions: [],
                totalVariants: 0,
                totalBytes: 0,
            };
        }

        const root = `${user.id}/${STUDIO_ROOT}`;
        const { data: sessionFolders, error: listErr } = await supabase.storage
            .from(bucket)
            .list(root, { limit: 100, sortBy: { column: "updated_at", order: "desc" } });

        if (listErr || !sessionFolders) {
            return {
                bucket,
                userId: user.id,
                sessions: [],
                totalVariants: 0,
                totalBytes: 0,
            };
        }

        const sessions: LibrarySession[] = await Promise.all(
            sessionFolders
                .filter((item) => !item.metadata) // folders come back with no metadata
                .map(async (folder) => {
                    const folderPath = `${root}/${folder.name}`;
                    const { data: files } = await supabase.storage
                        .from(bucket)
                        .list(folderPath, {
                            limit: 200,
                            sortBy: { column: "name", order: "asc" },
                        });

                    const variants: LibraryVariant[] = (files ?? [])
                        .filter((f) => f.metadata)
                        .map((f) => {
                            const path = `${folderPath}/${f.name}`;
                            const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
                            const presetId = guessPresetIdFromFilename(f.name);
                            const preset = presetId ? getPresetById(presetId) : undefined;
                            const size =
                                (f.metadata as { size?: number } | null)?.size ?? 0;
                            return {
                                name: f.name,
                                path,
                                publicUrl,
                                size,
                                updatedAt:
                                    (f.metadata as { lastModified?: string } | null)
                                        ?.lastModified ??
                                    (f as unknown as { updated_at?: string }).updated_at ??
                                    null,
                                presetId,
                                presetName: preset?.name ?? null,
                                mimeType:
                                    (f.metadata as { mimetype?: string } | null)?.mimetype ??
                                    guessMime(f.name),
                                width: preset?.width ?? null,
                                height: preset?.height ?? null,
                            };
                        });

                    return {
                        id: folder.name,
                        folder: `${STUDIO_ROOT}/${folder.name}`,
                        updatedAt:
                            (folder as unknown as { updated_at?: string }).updated_at ??
                            null,
                        variants,
                    };
                }),
        );

        const filteredSessions = sessions.filter((s) => s.variants.length > 0);
        const totalVariants = filteredSessions.reduce(
            (sum, s) => sum + s.variants.length,
            0,
        );
        const totalBytes = filteredSessions.reduce(
            (sum, s) => sum + s.variants.reduce((x, v) => x + v.size, 0),
            0,
        );

        return {
            bucket,
            userId: user.id,
            sessions: filteredSessions,
            totalVariants,
            totalBytes,
        };
    },
);
