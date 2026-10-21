// `expectNavigation` lives in summon's `/url` entry, a heavy entry that must stay out of first load
// (check:import-fanout walks the boot graph and refuses it). Callers sit in boot-reachable files, so
// they load it on the press instead. Order is kept: expect first, then `go` (the push).
type Url = typeof import("@ai-matrx/summon/url");
let url: Url | null = null;

export function expectNavigationThen(href: string, go: () => void): void {
  if (url) {
    url.expectNavigation(href);
    go();
    return;
  }
  void import("@ai-matrx/summon/url").then((m) => {
    url = m;
    m.expectNavigation(href);
    go();
  });
}
