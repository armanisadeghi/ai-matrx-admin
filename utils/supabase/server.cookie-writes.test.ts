/** @jest-environment node */

import { createClient } from "./server";
import { supabaseNext } from "./authCookie";

jest.mock("next/headers", () => ({
  cookies: async () => ({ getAll: () => [], set: jest.fn() }),
  headers: async () => new Headers({ host: "scustomer.localhost:3001" }),
}));
jest.mock("./authCookie", () => ({ supabaseNext: { serverClient: jest.fn(() => ({ auth: {} })) } }));
jest.mock("./adminLane", () => ({ adminLaneOpenForHeaders: () => false, installAdminLane: (client: unknown) => client }));
jest.mock("./restDeadline", () => ({ installRestDeadline: (client: unknown) => client }));

it.each([true, false])("forwards route cookie writes only when provided: %s", async (provided) => {
  jest.mocked(supabaseNext.serverClient).mockClear();
  const received: string[] = [];
  const appendSetCookie = (header: string) => received.push(header);
  await createClient(provided ? { appendSetCookie } : undefined);
  const options = jest.mocked(supabaseNext.serverClient).mock.calls[0][0];
  options.appendSetCookie?.("sb-matrx-auth-v2=; Path=/; Max-Age=0");
  expect(received).toEqual(provided ? ["sb-matrx-auth-v2=; Path=/; Max-Age=0"] : []);
  expect(options.host).toBe("scustomer.localhost:3001");
});
