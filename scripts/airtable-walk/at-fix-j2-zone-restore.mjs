// AT-FIX-J2: put test@test.com back on the device's time zone (Settings > Language & Region switch on) and print the switch state.
import { open, say, makeSetZone } from "./at-fix-j2-lib.mjs";
const { browser, page, who } = await open(true);
say("who", who);
await makeSetZone(page, say)(null);
await browser.close();
