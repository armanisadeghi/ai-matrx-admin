'use client';

import ConfigBuilder from '@/features/applet/builder/ConfigBuilder';
import BuilderPageLayout from './modules/common/BuilderPageLayout';

export default function ConfigBuilderPage() {
  return (
    <BuilderPageLayout activeModuleId="complete">
      <ConfigBuilder />
    </BuilderPageLayout>
  );
}
