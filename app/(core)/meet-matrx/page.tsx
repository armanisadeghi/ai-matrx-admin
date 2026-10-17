import type { Metadata } from "next";
import PageHeader from "@/features/shell/components/header/PageHeader";
import HeaderIconTitle from "@/features/shell/components/header/variants/variants/HeaderIconTitle";
import { MeetMatrx } from "@/features/onboarding/meet-matrx/meetMatrx";

export const metadata: Metadata = {
  title: "Meet Matrx",
  description: "The studios and building blocks of AI Matrx",
};

/** Meet Matrx, reopened any time from the user menu (the sign-up welcome shows it first). */
export default function MeetMatrxPage() {
  return (
    <>
      <PageHeader>
        <HeaderIconTitle icon="Compass" title="Meet Matrx" />
      </PageHeader>
      <div className="h-full overflow-hidden bg-textured pt-[var(--shell-header-h)]">
        <div className="h-full overflow-y-auto">
          <div className="mx-auto w-full max-w-5xl px-5 py-12 sm:py-16">
            <MeetMatrx />
          </div>
        </div>
      </div>
    </>
  );
}
