import { routeNameLink } from "../nameLink";

describe("routeNameLink (MKT-146)", () => {
  it("routes a website typed in the name box", () => {
    expect(routeNameLink("https://ballerinafarm.com/shop")).toEqual({ website: "https://ballerinafarm.com/shop", social: "", platform: null });
  });
  it("routes a link-in-bio page to the social side", () => {
    expect(routeNameLink("https://linktr.ee/ballerinafarm")).toMatchObject({ website: "", social: "https://linktr.ee/ballerinafarm" });
  });
  it("routes a social account link with its platform", () => {
    expect(routeNameLink("https://www.instagram.com/ballerinafarm/")).toMatchObject({ platform: "instagram" });
  });
  it("leaves real names alone", () => {
    expect(routeNameLink("Ballerina Farm")).toBeNull();
    expect(routeNameLink("Joe's Bar & Grill")).toBeNull();
  });
  it("does not treat a social post or section page as a website", () => {
    expect(routeNameLink("https://www.tiktok.com/discover/ballerina-farms")).toBeNull();
  });
});
