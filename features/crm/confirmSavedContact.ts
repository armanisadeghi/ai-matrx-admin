// features/crm/confirmSavedContact.ts
//
// THE SAVE-AS-CONTACT RUN REPORTS AN ID; THE DATABASE DECIDES IF IT IS REAL.
//
// The `crm.save_contact` agent answers with a party id and a sentence. A success toast built
// from that answer alone told a user "newly added to your CRM" for an id that existed in no
// table (2026-10-12: the server's transaction had silently rolled back). So the dialog never
// toasts success until the row is read back from `crm.party`.

import { supabase } from "@/utils/supabase/client";

export interface ConfirmedContact {
  id: string;
  display_name: string;
}

export type ContactRowReader = (
  partyId: string,
) => Promise<ConfirmedContact | null>;

/** The real read: one `crm.party` row by id, as the signed-in user (RLS applies). */
export const readPartyRow: ContactRowReader = async (partyId) => {
  const { data, error } = await supabase
    .schema("crm")
    .from("party")
    .select("id, display_name")
    .eq("id", partyId)
    .maybeSingle();
  if (error) throw new Error(`Could not check the saved contact: ${error.message}`);
  return data ? { id: data.id, display_name: data.display_name } : null;
};

/** Resolves with the stored row, or throws an honest error when no such row exists. */
export async function confirmSavedContact(
  partyId: string,
  read: ContactRowReader = readPartyRow,
): Promise<ConfirmedContact> {
  const row = await read(partyId);
  if (!row) {
    throw new Error(
      "The contact was not saved. The save reported success, but no record was found in your CRM.",
    );
  }
  return row;
}
