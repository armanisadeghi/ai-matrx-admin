import { TapTargetButtonGroup } from "@/components/icons/TapTargetButton";
import {
  OpenAITapButton,
  AnthropicTapButton,
  GoogleTapButton,
  GeminiTapButton,
  MetaTapButton,
  XaiTapButton,
  XTweetTapButton,
  CpuTapButton,
  ClaudeTapButton,
  LlamaTapButton,
  DeepSeekTapButton,
  FluxTapButton,
  GrokTapButton,
  MistralTapButton,
  PerplexityTapButton,
  PowerTapButton,
  TextGenerationTapButton,
  ImageGenerationTapButton,
  VideoGenerationTapButton,
  AudioLinesTapButton,
  TranscriptionTapButton,
  TranslationTapButton,
  CodeGenerationTapButton,
} from "@/components/icons/ai-tap-buttons";

export default function ButtonDemoPage() {
  return (
    <div className="p-8 space-y-12">
      <div>
        <h1 className="text-3xl font-bold mb-2">AI Tap Buttons Demo</h1>
        <p className="text-muted-foreground">
          A showcase of the modular TapTargetButton system applied to AI
          providers and generic tools.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">
          Model Provider Selector (Brand Colors)
        </h2>
        <p className="text-sm text-muted-foreground w-1/2">
          Clicking a logo could expand secondary options for that specific
          provider&apos;s sub-models. All black-brand logos safely use
          currentColor.
        </p>
        <div className="flex gap-4">
          <TapTargetButtonGroup>
            <GoogleTapButton variant="group" colored />
            <GeminiTapButton variant="group" colored />
            <OpenAITapButton variant="group" colored />
            <AnthropicTapButton variant="group" colored />
            <ClaudeTapButton variant="group" colored />
            <XaiTapButton variant="group" colored />
            <GrokTapButton variant="group" colored />
            <MetaTapButton variant="group" colored />
            <LlamaTapButton variant="group" colored />
            <DeepSeekTapButton variant="group" colored />
            <MistralTapButton variant="group" colored />
            <PerplexityTapButton variant="group" colored />
            <FluxTapButton variant="group" colored />
            <CpuTapButton variant="group" />
          </TapTargetButtonGroup>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">
          Model Provider Selector (Monochrome)
        </h2>
        <p className="text-sm text-muted-foreground w-1/2">
          The same group automatically styled to adapt to the surrounding text
          color for minimalist interfaces.
        </p>
        <div className="flex gap-4">
          <TapTargetButtonGroup>
            <GoogleTapButton variant="group" />
            <GeminiTapButton variant="group" />
            <OpenAITapButton variant="group" />
            <AnthropicTapButton variant="group" />
            <ClaudeTapButton variant="group" />
            <XaiTapButton variant="group" />
            <GrokTapButton variant="group" />
            <MetaTapButton variant="group" />
            <LlamaTapButton variant="group" />
            <DeepSeekTapButton variant="group" />
            <MistralTapButton variant="group" />
            <PerplexityTapButton variant="group" />
            <FluxTapButton variant="group" />
            <CpuTapButton variant="group" />
          </TapTargetButtonGroup>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">
          AI Action Tools — Lightning Family
        </h2>
        <p className="text-sm text-muted-foreground w-1/2">
          A cohesive set of AI action icons built around the lightning bolt
          motif. Each combines the bolt with domain-specific elements for
          instant recognition.
        </p>
        <div className="flex gap-4">
          <TapTargetButtonGroup>
            <PowerTapButton variant="group" />
            <TextGenerationTapButton variant="group" />
            <ImageGenerationTapButton variant="group" />
            <VideoGenerationTapButton variant="group" />
            <AudioLinesTapButton variant="group" />
            <CodeGenerationTapButton variant="group" />
            <TranscriptionTapButton variant="group" />
            <TranslationTapButton variant="group" />
          </TapTargetButtonGroup>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">
          Standalone Submissions (Variant: Solid)
        </h2>
        <p className="text-sm text-muted-foreground w-1/2">
          Utilizing primary solid buttons for high-priority generation triggers
          outside of a group.
        </p>
        <div className="flex gap-4">
          <PowerTapButton variant="solid" bgColor="bg-blue-600" />
          <TextGenerationTapButton variant="solid" bgColor="bg-violet-600" />
          <ImageGenerationTapButton variant="solid" bgColor="bg-emerald-600" />
          <CodeGenerationTapButton variant="solid" bgColor="bg-amber-600" />
        </div>
      </section>
    </div>
  );
}
