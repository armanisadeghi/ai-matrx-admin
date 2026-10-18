// record-view: UserRecordPage — one person's admin record, opened on one tab (deep link).
import { UserRecordPage } from "@/features/admin/users/record/UserRecordPage";

interface Props {
  params: Promise<{ id: string; tab: string }>;
}

export default async function AdminUserTabPage({ params }: Props) {
  const { id, tab } = await params;
  return <UserRecordPage userId={id} tab={tab} />;
}
