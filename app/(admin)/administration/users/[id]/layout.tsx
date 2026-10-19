// record-view: none — the user record is a system table (token user), which takes no custom fields
// UserRecordPage — the ONE page for one person in platform admin. Every user name in
// admin opens here. The record lives in THIS layout (keyed by the person only), so moving between
// Overview (/administration/users/<id>) and any tab (/administration/users/<id>/<tab>,
// userSurfaces.ts) never remounts it: no re-read of the person, no skeleton flash. The page reads
// the open tab from the address.
import type { ReactNode } from "react";
import { UserRecordPage } from "@/features/admin/users/record/UserRecordPage";

interface Props {
  params: Promise<{ id: string }>;
  children: ReactNode;
}

export default async function AdminUserLayout({ params, children }: Props) {
  const { id } = await params;
  return (
    <>
      <UserRecordPage userId={id} />
      {children}
    </>
  );
}
