/** One playground demo: a real shape component source and the item it renders. */
export interface PlaygroundDemo {
  /** The demo's kind slug — unique, prefixed `playground_`. */
  slug: string;
  title: string;
  /** Short labels for what the demo exercises. */
  covers: string[];
  /** The component source, written to the shape-authoring rulebook. */
  source: string;
  /** Realistic sample item (without `__kind`). */
  sample: Record<string, unknown>;
  /** The demo saves onto its item (save_item_state / saveAs) and needs a real record. */
  savesItemState?: boolean;
}
