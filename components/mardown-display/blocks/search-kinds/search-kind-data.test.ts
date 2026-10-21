import { placesBesideEntity } from "./search-kind-data";

describe("placesBesideEntity", () => {
  const entity = { name: "Rooted Yoga & Wellness", place: { address: "1 Main St" } };
  it("drops the place the card already shows", () => {
    const places = [{ name: "Rooted Yoga & Wellness" }, { name: "Other Studio" }];
    expect(placesBesideEntity(places, entity)).toEqual([{ name: "Other Studio" }]);
  });
  it("keeps everything when the card is not a place or there is no card", () => {
    const places = [{ name: "Rooted Yoga & Wellness" }];
    expect(placesBesideEntity(places, { name: "Rooted Yoga & Wellness" })).toEqual(places);
    expect(placesBesideEntity(places, null)).toEqual(places);
  });
});
