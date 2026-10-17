/**
 * The app's host types for @ai-matrx/summon: link hydrators receive the app's thunk-aware
 * dispatch, so a hydrator that hands dispatch to an app helper needs no cast.
 */
import type { AppDispatch } from "@/lib/redux/store";

declare module "@ai-matrx/summon" {
  interface OverlayHostTypes {
    dispatch: AppDispatch;
  }
}

export {};
