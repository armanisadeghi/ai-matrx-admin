// The platform's starting values for smart_add.brand_match.* (the seeded feature knobs), for tests of the pure matcher.
import { parseMatchRules } from "../../brandMatch";

export const SEEDED_RULES = parseMatchRules({
  genericWords: ["the", "and", "a", "of", "my", "our", "your", "best", "new", "old", "good", "great", "local", "first", "city", "coffee", "cafe", "restaurant", "bar", "grill", "pizza", "shop", "store", "market", "studio", "studios", "salon", "spa", "gym", "fitness", "clinic", "dental", "dentist", "law", "legal", "realty", "real", "estate", "homes", "home", "auto", "repair", "services", "service", "solutions", "group", "consulting", "marketing", "design", "media", "digital", "agency", "company", "enterprises", "partners", "international", "global", "systems", "technologies", "tech", "labs", "lab", "works", "house", "bakery", "bistro", "kitchen", "food", "foods", "beauty", "health", "wellness", "yoga", "photography", "construction", "cleaning", "plumbing", "roofing"],
  sharedHosts: ["instagram.com", "facebook.com", "fb.com", "twitter.com", "x.com", "tiktok.com", "youtube.com", "youtu.be", "linkedin.com", "pinterest.com", "threads.net", "snapchat.com", "reddit.com", "yelp.com", "google.com", "linktr.ee", "linktree.com", "stan.store", "beacons.ai", "bio.link", "carrd.co", "wixsite.com", "wordpress.com", "squarespace.com", "shopify.com", "myshopify.com", "github.io", "medium.com", "substack.com", "etsy.com", "amazon.com", "ebay.com", "tripadvisor.com", "wikipedia.org", "gmail.com", "yahoo.com", "outlook.com"],
  nameMinLength: 3,
});
