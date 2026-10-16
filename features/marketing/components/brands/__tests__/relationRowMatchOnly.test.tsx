/**
 * Arman, 2026-10-16: a match-only Relationships row (Broken link, Former…) shows its address as plain text with the
 * reason; it is never an outbound link and never carries our referral (utm) parameters.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { RelationRowView } from "../BrandRelationsCard";

const URL = "https://www.youtube.com/channel/UCF4Ku_RBslqV3A36j6KddZQ";
const base = {
  id: "property:d95b89fc",
  label: "youtube · UCF4Ku_RBslqV3A36j6KddZQ",
  url: URL,
  kindLabel: "Broken link",
  remove: async () => {},
};

describe("RelationRowView", () => {
  it("renders a match-only row as plain text with the reason and no link", () => {
    const html = renderToStaticMarkup(
      <RelationRowView
        canEdit
        row={{ ...base, matchOnly: true, grounding: { where: "youtube", reason: "YouTube: This channel does not exist.", confidence: null, by: null } }}
      />,
    );
    expect(html).not.toContain("<a ");
    expect(html).not.toContain("utm_");
    expect(html).toContain("This channel does not exist");
    expect(html).toContain(URL);
  });

  it("still links a row in use through the referral link", () => {
    const html = renderToStaticMarkup(<RelationRowView canEdit row={{ ...base, kindLabel: "Partner" }} />);
    expect(html).toContain("<a ");
    expect(html).toContain("utm_");
  });
});
