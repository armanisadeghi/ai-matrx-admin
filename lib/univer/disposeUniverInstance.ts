import { releaseMatrxImageStore } from "@/lib/univer/univerImageStore";

/** Univer owns React roots; synchronous dispose during React commit causes races. */
export function disposeUniverInstance(
  instance: { dispose(): void } | null | undefined,
): void {
  const target = instance;
  if (!target) return;
  const injector = (target as { __getInjector?: () => object }).__getInjector?.();
  queueMicrotask(() => {
    releaseMatrxImageStore(injector);
    try {
      target.dispose();
    } catch {
      // Instance may already be torn down by a concurrent unmount.
    }
  });
}
