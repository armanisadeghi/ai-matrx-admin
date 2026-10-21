// Writes features/shell/frame/route-homes.generated.ts (see route-homes.build.ts).
import fs from "node:fs";
import { ROUTE_HOMES_GENERATED_PATH, renderRouteHomes } from "../features/shell/frame/route-homes.build";

fs.writeFileSync(ROUTE_HOMES_GENERATED_PATH, renderRouteHomes());
console.log(`wrote ${ROUTE_HOMES_GENERATED_PATH}`);
