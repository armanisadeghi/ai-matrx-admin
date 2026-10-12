"use client";

/**
 * The look a home is drawn in (the person's Office look), handed to the parts the page builds and
 * passes in (the start band, its tiles) so they skin themselves without new props at every page.
 */

import { createContext, useContext } from "react";
import type { OfficeLook } from "../skin/office-look";
import type { HomeKind } from "./home-kinds";

export const HomeLookContext = createContext<{ look: OfficeLook; kind: HomeKind | null }>({ look: "google", kind: null });

export function useHomeLook() {
  return useContext(HomeLookContext);
}
