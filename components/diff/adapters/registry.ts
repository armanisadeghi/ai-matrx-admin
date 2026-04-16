import type { FieldAdapter, AdapterRegistry } from "./types";

export function createAdapterRegistry(): AdapterRegistry {
  const adapters = new Map<string, FieldAdapter>();

  return {
    register(fieldPath: string, adapter: FieldAdapter) {
      adapters.set(fieldPath, adapter);
    },
    get(fieldPath: string) {
      return adapters.get(fieldPath);
    },
    getAll() {
      return new Map(adapters);
    },
  };
}
