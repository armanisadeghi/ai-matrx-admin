// AT-FIX-J2 seed: one disposable "ATFJ2 main" table (Name, Qty, Tags, Joined, Start), 3 rows, as admin; prints its id.
import { admin, seedTable, say } from "./at-fix-j-lib.mjs";
const a = await admin();
const id = await seedTable(a.client, "j2" + Math.random().toString(36).slice(2, 5));
say("TABLE", id);
