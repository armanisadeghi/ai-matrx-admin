'use client';

import GroupBuilder from '@/features/applet/builder/modules/group-builder/GroupBuilder';
import BuilderPageLayout from '../common/BuilderPageLayout';

export default function GroupBuilderPage() {
  return (
    <BuilderPageLayout activeModuleId="groups">
      <GroupBuilder />
    </BuilderPageLayout>
  );
} 