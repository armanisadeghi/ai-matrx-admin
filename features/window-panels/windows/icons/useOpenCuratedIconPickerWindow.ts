"use client";

/**
 * useOpenCuratedIconPickerWindow
 *
 * Imperative opener for `CuratedIconPickerWindow`. Callers get back a handle
 * that can close the window or detach the callback group without closing.
 *
 * Usage:
 *
 *   const openIconPicker = useOpenCuratedIconPickerWindow();
 *   const handle = openIconPicker({
 *     onPicked: (e) => onChange(e.iconId),
 *   });
 *   // later
 *   handle.close();
 */

import { useCallback, useEffect, useRef } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@/lib/redux/slices/overlaySlice";
import {
    createCuratedIconPickerCallbackGroup,
    type CuratedIconPickerHandlers,
    type CuratedIconPickerWindowData,
} from "./callbacks";

const OVERLAY_ID = "curatedIconPickerWindow";

export interface OpenCuratedIconPickerOptions
    extends CuratedIconPickerHandlers {
    /** Optional stable instance id. Omit for a unique new window each call. */
    instanceId?: string;
}

export interface CuratedIconPickerHandle {
    overlayId: string;
    instanceId: string;
    callbackGroupId: string;
    /** Close the window AND dispose the callback group. */
    close: () => void;
    /** Leave the window open; stop receiving events. */
    dispose: () => void;
}

type HandleRef = {
    instanceId: string;
    callbackGroupId: string;
    dispose: () => void;
};

export function useOpenCuratedIconPickerWindow() {
    const dispatch = useAppDispatch();
    const handlesRef = useRef<Set<HandleRef>>(new Set());

    useEffect(() => {
        const handles = handlesRef.current;
        return () => {
            for (const h of handles) h.dispose();
            handles.clear();
        };
    }, []);

    return useCallback(
        (options: OpenCuratedIconPickerOptions = {}): CuratedIconPickerHandle => {
            const instanceId =
                options.instanceId ??
                `${OVERLAY_ID}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

            const { callbackGroupId, dispose } =
                createCuratedIconPickerCallbackGroup({
                    onPicked: options.onPicked,
                    onWindowClose: options.onWindowClose,
                    onEvent: options.onEvent,
                });

            const data: CuratedIconPickerWindowData = { callbackGroupId };
            dispatch(openOverlay({ overlayId: OVERLAY_ID, instanceId, data }));

            const handleRef: HandleRef = {
                instanceId,
                callbackGroupId,
                dispose,
            };
            handlesRef.current.add(handleRef);

            const close = () => {
                dispatch(closeOverlay({ overlayId: OVERLAY_ID, instanceId }));
                dispose();
                handlesRef.current.delete(handleRef);
            };

            const detach = () => {
                dispose();
                handlesRef.current.delete(handleRef);
            };

            return {
                overlayId: OVERLAY_ID,
                instanceId,
                callbackGroupId,
                close,
                dispose: detach,
            };
        },
        [dispatch],
    );
}
