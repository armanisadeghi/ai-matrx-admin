// /board/<id> while the server renders the page. Without this boundary a client navigation
// (router.push from "New board") does not commit — the URL stays on the list — until the server
// has answered, so a slow or cold server looked like "the board was made but did not open".
// With it the route commits at once and the board's own placeholders show from the first frame.

import { RegionSkeleton } from "@ai-matrx/design-system/controls";

export default function BoardOpeningLoading() {
  return (
    <div className="h-full min-h-0 w-full overflow-hidden p-4">
      <RegionSkeleton shape="cards" count={6} aria-label="Opening your board" />
    </div>
  );
}
