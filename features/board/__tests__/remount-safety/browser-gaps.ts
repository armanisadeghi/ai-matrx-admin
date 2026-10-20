/**
 * What jsdom lacks and every tile body assumes a browser has: ResizeObserver,
 * IntersectionObserver, matchMedia, scrollIntoView. Inert stand-ins — they
 * report nothing, which a tile treats like a box that has not been measured.
 * `fetch` and `XMLHttpRequest` are the recording ones (fake-backend.ts).
 */

import { FakeXMLHttpRequest, createObjectURL, fakeFetch, revokeObjectURL } from "./fake-backend";

class InertObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}

/**
 * jsdom has no `MessageChannel` and no `requestIdleCallback`, and `@ai-matrx/kit`'s idle scheduler falls back
 * to a message channel when a frame fires: the ReferenceError surfaced as an "unhandled exception" on
 * `console.error` and failed every case that ran past a frame. The browser's one-way message hop, on a timer.
 */
class StandInMessagePort {
  onmessage: ((event: { data: unknown }) => void) | null = null;
  peer: StandInMessagePort | null = null;
  postMessage(data: unknown) {
    const to = this.peer;
    setTimeout(() => to?.onmessage?.({ data }), 0);
  }
  close() {
    this.peer = null;
  }
}
class StandInMessageChannel {
  port1 = new StandInMessagePort();
  port2 = new StandInMessagePort();
  constructor() {
    this.port1.peer = this.port2;
    this.port2.peer = this.port1;
  }
}

export function installBrowserGaps(): void {
  const g = globalThis as Record<string, unknown>;
  g.MessageChannel ??= StandInMessageChannel;
  g.ResizeObserver ??= InertObserver;
  g.IntersectionObserver ??= InertObserver;
  g.fetch = fakeFetch;
  // The person is in this tab for the whole case. jsdom answers `hasFocus()` true only once some element holds focus, so
  // without this "is the person looking" flips mid-case and a look the dock owes at first mount lands during the wake.
  if (typeof document !== "undefined") document.hasFocus = () => true;
  // jsdom's XMLHttpRequest makes REAL requests; nothing in this suite may reach a server.
  g.XMLHttpRequest = FakeXMLHttpRequest;
  if (typeof window !== "undefined") (window as unknown as Record<string, unknown>).XMLHttpRequest = FakeXMLHttpRequest;
  // jsdom's Blob has no text()/arrayBuffer(); FileReader reads it the browser way.
  Blob.prototype.text ??= function text(this: Blob) {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsText(this);
    });
  };
  Blob.prototype.arrayBuffer ??= function arrayBuffer(this: Blob) {
    return new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(this);
    });
  };
  URL.createObjectURL = createObjectURL;
  URL.revokeObjectURL = revokeObjectURL;
  if (typeof window !== "undefined") {
    window.matchMedia ??= ((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;
    Element.prototype.scrollIntoView ??= function scrollIntoView() {};
    Element.prototype.scrollTo ??= function scrollTo() {};
    // A selection's geometry (the selection toolbar measures it): an unmeasured box, as for the observers.
    const emptyRect = { x: 0, y: 0, width: 0, height: 0, top: 0, right: 0, bottom: 0, left: 0, toJSON: () => ({}) };
    Range.prototype.getBoundingClientRect ??= () => emptyRect as DOMRect;
    Range.prototype.getClientRects ??= () => [] as unknown as DOMRectList;
  }
}
