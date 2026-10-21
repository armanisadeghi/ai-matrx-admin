import {
  DEFAULT_DIRECTORY_FILTERS,
  catalogSearchKeywords,
  directoryDetailFromParams,
  filterDirectory,
  savedAccountSummary,
  type IntegrationDirectoryItem,
} from "./integration-directory";

function item(
  overrides: Partial<IntegrationDirectoryItem> & Pick<IntegrationDirectoryItem, "id" | "name">,
): IntegrationDirectoryItem {
  return {
    description: "Connect work safely",
    vendor: "Example",
    category: "productivity",
    keywords: "files calendar",
    artwork: {
      id: overrides.id,
      name: overrides.name,
      blurb: "Connect work safely",
      surfaces: ["directory"],
    },
    featured: false,
    saved: false,
    connected: false,
    available: true,
    comingSoon: false,
    status: "Not connected",
    attention: false,
    ...overrides,
  };
}

describe("integration directory filters", () => {
  const items = [
    item({ id: "slack", name: "Slack", category: "communication", keywords: "messages team", featured: true }),
    item({ id: "drive", name: "Google Drive", saved: true, connected: true, accountSummary: "a@example.com" }),
    item({ id: "expired", name: "Box", saved: true, attention: true, status: "Needs attention", accountSummary: "b@example.com" }),
    item({ id: "soon", name: "Future", comingSoon: true, available: false }),
  ];

  it("combines category, status, and search rather than dropping filters while searching", () => {
    expect(
      filterDirectory(items, {
        ...DEFAULT_DIRECTORY_FILTERS,
        query: "team slack",
        category: "communication",
        status: "available",
      }).map((row) => row.id),
    ).toEqual(["slack"]);
  });

  it("keeps saved attention rows in Yours and places them before healthy rows", () => {
    expect(
      filterDirectory(items, { ...DEFAULT_DIRECTORY_FILTERS, view: "yours" }).map((row) => row.id),
    ).toEqual(["expired", "drive"]);
  });
});

describe("saved account summaries", () => {
  it("retains every persisted account while only repair-needed accounts ask for attention", () => {
    expect(savedAccountSummary([
      { identity: "expired@example.com", status: "needs_reauth" },
      { identity: "gone@example.com", status: "revoked" },
      { identity: "old@example.com", status: "disconnected" },
    ], false, false)).toMatchObject({ saved: true, connected: false, attention: true, available: true, status: "Needs attention", accountSummary: "expired@example.com, gone@example.com, old@example.com" });
  });

  it("never turns unknown or unavailable statuses into connected or actionable accounts", () => {
    expect(savedAccountSummary([{ identity: "unknown@example.com", status: null }], false, false)).toMatchObject({ saved: true, connected: false, attention: false, available: false, status: "Status unavailable" });
    expect(savedAccountSummary([{ identity: "blocked@example.com", status: "unavailable" }], false, false)).toMatchObject({ saved: true, connected: false, attention: false, available: false, status: "Unavailable" });
  });

  it("keeps revoked-only and disconnected-only rows saved without calling them connected", () => {
    expect(savedAccountSummary([{ identity: "revoked@example.com", status: "revoked" }], false, false)).toMatchObject({ saved: true, connected: false, attention: false, status: "Revoked" });
    expect(savedAccountSummary([{ identity: "gone@example.com", status: "disconnected" }], false, false)).toMatchObject({ saved: true, connected: false, attention: false, status: "Disconnected" });
  });

  it("says checking or unavailable when reads are loading or failed", () => {
    const rows = [{ identity: "me@example.com", status: "connected" }];
    expect(savedAccountSummary(rows, true, false)).toMatchObject({ saved: true, connected: false, available: false, status: "Checking…" });
    expect(savedAccountSummary(rows, false, true)).toMatchObject({ saved: true, connected: false, available: false, status: "Status unavailable" });
  });
});

describe("OAuth return detail mapping", () => {
  it("maps native returns and preserves unknown provider details", () => {
    expect(directoryDetailFromParams(new URLSearchParams("microsoft_status=ok"))).toBe("native:microsoft");
    expect(directoryDetailFromParams(new URLSearchParams("provider=dropbox&oauth_status=success"))).toBe("native:dropbox");
    expect(directoryDetailFromParams(new URLSearchParams("provider=slack"))).toBe("provider:slack");
  });
});


describe("the directory finds a catalog connector by the products the CATALOG stores for it (defect D)", () => {
  const atlassian = item({
    id: "atlassian",
    name: "Atlassian (Jira & Confluence)",
    keywords: catalogSearchKeywords({
      slug: "atlassian",
      products: [
        { name: "Jira", aliases: ["tickets", "sprints"] },
        { name: "Confluence", aliases: ["wiki"] },
      ],
    }),
  });
  const bare = item({ id: "atlassian", name: "Atlassian (Jira & Confluence)", keywords: catalogSearchKeywords({ slug: "atlassian", products: [] }) });

  it("names, aliases and the slug are all searchable", () => {
    for (const word of ["jira", "tickets", "sprints", "wiki", "atlassian"]) {
      expect(filterDirectory([atlassian], { ...DEFAULT_DIRECTORY_FILTERS, query: word })).toHaveLength(1);
    }
  });

  it("without the catalog's products the same alias finds nothing — the data is what finds it", () => {
    expect(filterDirectory([bare], { ...DEFAULT_DIRECTORY_FILTERS, query: "sprints" })).toHaveLength(0);
  });
});

describe("a card names only the person's own accounts", () => {
  const raw = [
    { identity: "arman26@gmail.com", status: "connected" },
    { identity: "Arman26@gmail.com", status: "connected" },
    { identity: "firebase-adminsdk-fbsvc@project.iam.gserviceaccount.com", status: "connected" },
    { identity: "work@example.com", status: "connected" },
    { identity: "third@example.com", status: "connected" },
    { identity: "fourth@example.com", status: "connected" },
    { identity: "svc-reports@acme.iam.gserviceaccount.com", status: "connected" },
  ];

  it("hides service accounts and repeats nothing", () => {
    const summary = savedAccountSummary(raw, false, false);
    expect(summary.accounts).toEqual([
      "arman26@gmail.com",
      "work@example.com",
      "third@example.com",
      "fourth@example.com",
    ]);
    expect(summary.accountSummary).not.toMatch(/gserviceaccount|firebase/i);
    expect(summary.accountSummary?.match(/arman26/gi)).toHaveLength(1);
  });

  it("is compact: two names then a count, never the whole list", () => {
    expect(savedAccountSummary(raw, false, false).accountSummary).toBe(
      "arman26@gmail.com, work@example.com +2",
    );
  });

  it("keeps the service accounts for an admin's Advanced view only", () => {
    expect(savedAccountSummary(raw, false, false).serviceAccounts).toEqual([
      "firebase-adminsdk-fbsvc@project.iam.gserviceaccount.com",
      "svc-reports@acme.iam.gserviceaccount.com",
    ]);
  });

  it("never loses the connection itself when only a service account exists", () => {
    const only = savedAccountSummary([raw[2]], false, false);
    expect(only.saved).toBe(true);
    expect(only.accountSummary).toBe("");
  });
});
