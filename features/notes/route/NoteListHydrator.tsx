"use client";

import { useRef } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { upsertNoteFromServer } from "../redux/slice";
import type { NoteListItem } from "../types";

interface NoteListHydratorProps {
    seeds: NoteListItem[];
}

/**
 * One-shot Redux hydrator — renders null, dispatches during the first render
 * pass (before children read the store), then never re-dispatches.
 *
 * Do NOT use useEffect — it fires after paint, causing a one-frame flash.
 */
export function NoteListHydrator({ seeds }: NoteListHydratorProps) {
    const dispatch = useAppDispatch();
    const hydrated = useRef(false);

    if (!hydrated.current) {
        for (const seed of seeds) {
            dispatch(
                upsertNoteFromServer({
                    note: seed,
                    fetchStatus: "list",
                }),
            );
        }
        hydrated.current = true;
    }

    return null;
}
