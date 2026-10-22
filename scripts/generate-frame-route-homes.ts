// Writes features/shell/frame/route-homes.generated.ts and go-to-pages.generated.ts (see route-homes.build.ts).
import fs from "node:fs";
import {
  GO_TO_PAGES_GENERATED_PATH,
  ROUTE_HOMES_GENERATED_PATH,
  renderGoToPages,
  renderRouteHomes,
} from "../features/shell/frame/route-homes.build";

fs.writeFileSync(ROUTE_HOMES_GENERATED_PATH, renderRouteHomes());
console.log(`wrote ${ROUTE_HOMES_GENERATED_PATH}`);
fs.writeFileSync(GO_TO_PAGES_GENERATED_PATH, renderGoToPages());
console.log(`wrote ${GO_TO_PAGES_GENERATED_PATH}`);
