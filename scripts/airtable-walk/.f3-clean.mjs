import { store } from "./store.mjs";
const { client } = await store();
const ids = ["24e9ead2-d523-4b09-85a1-0d639ab5c42c","864a0e24-240a-4d7d-a7f7-4d37176df5e3","45cc8b0d-756b-4536-9710-cf768049f724","3cf12f88-457c-4f15-921b-dd85f0f56ab8","424598f9-75ab-4d2c-86d1-75308f1f1c4b","e08f275b-e236-41d4-92f2-93d83098e2ee","8a2a289f-abfa-4232-a8c8-096b5eb01146","89725e46-9e4e-49ab-9bf0-08bf20a1e739","6d2501c1-e365-4513-b244-6bf27fb93543","600b3816-58f4-45cf-a1fc-b53568705775"];
for (const id of ids) { let r; for (let i = 0; i < 40; i++) { r = await client.tableArchive({ table_id: id, chunk: 20, includeTable: true }); if (!r.ok || r.data.done) break; } console.log(id, r.ok, JSON.stringify(r.data ?? r).slice(0,100)); }
