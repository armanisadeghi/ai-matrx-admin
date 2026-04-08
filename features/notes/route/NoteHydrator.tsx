"use client";

import { useRef } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { upsertNoteFromServer } from "../redux/slice";
import type { Note } from "../types";

interface NoteHydratorProps {
    note: Note;
}

/**
 * Hydrates a single full note into Redux during the first render pass.
 * Placed in the [id] layout so it runs once and persists across sub-page
 * navigation within the same note (edit ↔ preview ↔ split etc.).
 */
export function NoteHydrator({ note }: NoteHydratorProps) {
    const dispatch = useAppDispatch();
    const hydrated = useRef(false);

    if (!hydrated.current) {
        dispatch(
            upsertNoteFromServer({
                note,
                fetchStatus: "full",
            }),
        );
        hydrated.current = true;
    }

    return null;
}
