import PdRatingsCalculatorLanding from "@/features/legal/wc/pd-ratings/components/landing/PdRatingsCalculatorLanding";

export default function PdRatingsCalculatorPage() {
  return (
    <div className="h-dvh w-full overflow-y-auto bg-textured">
      <div style={{ height: "var(--shell-header-h, 2.75rem)" }} />
      <PdRatingsCalculatorLanding />
    </div>
  );
}
