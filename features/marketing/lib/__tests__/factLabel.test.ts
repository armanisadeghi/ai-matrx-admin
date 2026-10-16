// Creativity Warehouse, 2026-10-16: five Listing facts showed the sub-label "Other Listing". Nothing is "other":
// a listing names its platform from its URL.
import { factDisplayLabel, isGenericFactLabel, listingSiteName } from "../factLabel";

describe("fact labels never say 'Other'", () => {
  it.each([
    ["https://www.mapquest.com/us/new-mexico/creativity-warehouse-423551719", "MapQuest"],
    ["https://www.superpages.com/albuquerque-nm/bpp/creativity-warehouse-548734892", "Superpages"],
    ["https://albuquerque.kidsoutandabout.com/content/creativity-warehouse", "kidsoutandabout.com"],
    ["https://www.newmexico.org/listing/creativity-warehouse-llc/15920/", "newmexico.org"],
    ["https://www.visitalbuquerque.org/listing/creativity-warehouse/14317/", "visitalbuquerque.org"],
    ["https://www.yell.co.uk/biz/some-shop-123", "yell.co.uk"],
  ])("Other Listing at %s reads %s", (url, name) => {
    expect(factDisplayLabel("Other Listing", url)).toBe(name);
  });

  it("a real label is never rewritten", () => {
    expect(factDisplayLabel("Yelp Page", "https://www.yelp.com/biz/x")).toBe("Yelp Page");
    expect(factDisplayLabel("Phone", "+1 505 555 0100")).toBe("Phone");
    expect(isGenericFactLabel("Otherworldly Ceramics")).toBe(false);
  });

  it("a catch-all with no URL drops the word 'Other'", () => {
    expect(factDisplayLabel("Other Listing", "Listed in the city guide")).toBe("Listing");
  });

  it("an unparseable value is no platform", () => {
    expect(listingSiteName("not a url")).toBeNull();
  });
});
