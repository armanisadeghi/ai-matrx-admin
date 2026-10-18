// record-view: UserRecordPage — the ONE page for one person in platform admin (Overview tab).
// Every user name in admin opens here; tabs are /administration/users/<id>/<tab> (userSurfaces.ts).
import { UserRecordPage } from "@/features/admin/users/record/UserRecordPage";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AdminUserPage({ params }: Props) {
  const { id } = await params;
  return <UserRecordPage userId={id} />;
}
