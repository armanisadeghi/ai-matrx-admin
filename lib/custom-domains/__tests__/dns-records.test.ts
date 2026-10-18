import { apexOf, dnsRecordsFor, statusFor } from "../dns-records";

describe("dnsRecordsFor", () => {
  it("asks for an A record at the apex", () => {
    expect(dnsRecordsFor("cedarridgept.com", { ipv4: "76.76.21.21" })).toEqual([
      { type: "A", name: "@", value: "76.76.21.21", purpose: "routing" },
    ]);
  });
  it("asks for a CNAME on a subdomain, with Vercel's recommendation and no trailing dot", () => {
    expect(dnsRecordsFor("book.cedarridgept.com", { cname: "abc.vercel-dns-017.com." })).toEqual([
      { type: "CNAME", name: "book", value: "abc.vercel-dns-017.com", purpose: "routing" },
    ]);
  });
  it("falls back to Vercel's documented defaults and honours two-part suffixes", () => {
    expect(dnsRecordsFor("book.clinic.co.uk", {})[0]).toEqual({ type: "CNAME", name: "book", value: "cname.vercel-dns.com", purpose: "routing" });
    expect(apexOf("book.clinic.co.uk")).toBe("clinic.co.uk");
    expect(dnsRecordsFor("clinic.co.uk", {})[0].type).toBe("A");
  });
  it("adds the ownership TXT Vercel asks for, relative to the apex", () => {
    const records = dnsRecordsFor("book.cedarridgept.com", {
      verification: [{ type: "TXT", domain: "_vercel.cedarridgept.com", value: "vc-domain-verify=book.cedarridgept.com,abc" }],
    });
    expect(records[1]).toEqual({ type: "TXT", name: "_vercel", value: "vc-domain-verify=book.cedarridgept.com,abc", purpose: "ownership" });
  });
});

describe("statusFor", () => {
  it("is live only when verified and configured", () => {
    expect(statusFor({ onProject: true, verified: true, misconfigured: false, records: [] })).toBe("live");
    expect(statusFor({ onProject: true, verified: true, misconfigured: true, records: [] })).toBe("verifying");
    expect(statusFor({ onProject: true, verified: false, misconfigured: false, records: [] })).toBe("verifying");
    expect(statusFor({ onProject: false, verified: false, misconfigured: true, records: [] })).toBe("failed");
  });
});
