import { registerPanelHydrator } from "./UrlPanelRegistry";
import { setInstanceDisplayMode } from "@/features/agents/redux/execution-system/instance-ui-state/instance-ui-state.slice";
import { openOverlay } from "@/lib/redux/slices/overlaySlice";

/**
 * Register all known panel URL hydrators.
 * This runs exactly once on client mount.
 */
export function initUrlHydration() {
    // Agent execution floating panels
    registerPanelHydrator("agent", (dispatch, id, args) => {
        dispatch(setInstanceDisplayMode({ 
            instanceId: id, 
            mode: (args.m as "floating-chat" | "modal-full" | "panel") || 'floating-chat' 
        }));
    });

    // Voice Pad global panel
    registerPanelHydrator("voice", (dispatch) => {
        dispatch(openOverlay({ overlayId: "voicePad" }));
    });

    // Quick notes global panel
    registerPanelHydrator("notes", (dispatch) => {
        dispatch(openOverlay({ overlayId: "quickNotes" }));
    });
}
