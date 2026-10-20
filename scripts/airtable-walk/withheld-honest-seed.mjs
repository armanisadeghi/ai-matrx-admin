// WITHHELD-HONEST: seed one disposable table in the test organization and print its id. Archive it with withheld-honest-archive.mjs.
import { admin, seedTable, say } from "./at-fix-j-lib.mjs";
const a = await admin();
const id = await seedTable(a.client, "wh" + Math.random().toString(36).slice(2, 5));
say("TABLE", id);
