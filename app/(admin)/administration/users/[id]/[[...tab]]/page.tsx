// record-view: UserRecordPage — the ONE page for one person in platform admin. Every user name in
// admin opens here. ONE optional catch-all serves Overview (/administration/users/<id>) and every tab
// (/administration/users/<id>/<tab>, userSurfaces.ts), so switching Overview ↔ a tab keeps the same
// page mounted — no re-read of the person, no skeleton flash.
import { UserRecordPage } from "@/features/admin/users/record/UserRecordPage";

interface Props {
  params: Promise<{ id: string; tab?: string[] }>;
}

export default async function AdminUserPage({ params }: Props) {
  const { id, tab } = await params;
  // A deeper address (/<id>/<tab>/<more>) names no tab: the page treats it as unknown → Overview.
  const name = tab && tab.length === 1 ? tab[0] : tab && tab.length > 1 ? tab.join("/") : undefined;
  return <UserRecordPage userId={id} tab={name} />;
}
