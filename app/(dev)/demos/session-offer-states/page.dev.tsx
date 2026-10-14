import { createRouteMetadata } from "@/utils/route-metadata";
import SessionOfferStates from "./SessionOfferStates";

export const metadata = createRouteMetadata("/demos/session-offer-states", {
  title: "Session offer card states",
  description: "The session offer card in every state, from fixtures. No AI spend.",
});

export default function SessionOfferCardPage() {
  return <SessionOfferStates />;
}
