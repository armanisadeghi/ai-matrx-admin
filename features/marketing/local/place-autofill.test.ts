import { observedFromPlaceRecord, parsePlaceAddress, placeLookupUrl, placeRatingWords, buildProfileSuggestions } from "./profile-autofill";
import type { BusinessLocation } from "@/features/marketing/types";

describe("Fill from Google Maps mapping", () => {
  it("splits a US place address into the profile's address fields", () => {
    expect(parsePlaceAddress("1600 Amphitheatre Pkwy, Mountain View, CA 94043, United States")).toEqual({
      street_address: "1600 Amphitheatre Pkwy",
      locality: "Mountain View",
      region: "CA",
      postal_code: "94043",
      country_code: "US",
    });
  });

  it("keeps an address it cannot split whole in the street field instead of dropping it", () => {
    expect(parsePlaceAddress("Somewhere unusual")).toEqual({ street_address: "Somewhere unusual" });
  });

  it("maps a place record to the autofill fields, skipping empties", () => {
    const observed = observedFromPlaceRecord({
      name: "Googleplex",
      address: "1600 Amphitheatre Pkwy, Mountain View, CA 94043",
      phone_number: "+1 650-253-0000",
      open_website: "https://www.google.com/",
      category: "Corporate office",
      description: "  ",
      rating: 4.6,
    });
    expect(observed).toMatchObject({
      street_address: "1600 Amphitheatre Pkwy",
      locality: "Mountain View",
      region: "CA",
      postal_code: "94043",
      phone: "+1 650-253-0000",
      website_url: "https://www.google.com/",
      business_type: "Corporate office",
    });
    expect(observed.description).toBeUndefined();
  });

  it("feeds the existing suggestions, only for empty fields, as the live Google listing", () => {
    const location = { street_address: "Filled already", phone: null, region: null } as unknown as BusinessLocation;
    const out = buildProfileSuggestions(location, {
      googleObserved: { street_address: "1 New St", phone: "+1 555 0100", region: "CA" },
    });
    expect(out.find((s) => s.field === "street_address")).toBeUndefined();
    expect(out.find((s) => s.field === "phone")).toEqual({ field: "phone", value: "+1 555 0100", source: "google" });
    expect(out.every((s) => s.source === "google")).toBe(true);
  });

  it("accepts a Maps place link or a bare place id, nothing else", () => {
    expect(placeLookupUrl("ChIJj61dQgK6j4AR4GeTYWZsKWw")).toBe("https://www.google.com/maps/place/?q=place_id:ChIJj61dQgK6j4AR4GeTYWZsKWw");
    expect(placeLookupUrl("https://www.google.com/maps/place/Googleplex/@37.4,-122.0")).not.toBeNull();
    expect(placeLookupUrl("https://www.google.com/search?q=pizza")).toBeNull();
    expect(placeLookupUrl("https://example.com/maps/place/x")).toBeNull();
    expect(placeLookupUrl("")).toBeNull();
  });

  it("words the rating", () => {
    expect(placeRatingWords({ rating: 4.6, reviews_count: 1203 })).toBe("4.6 from 1,203 reviews");
    expect(placeRatingWords({})).toBeNull();
  });
});
