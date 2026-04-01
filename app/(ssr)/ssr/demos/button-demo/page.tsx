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
import {
  MenuTapButton,
  PlusTapButton,
  SearchTapButton,
  SettingsTapButton,
  Settings2TapButton,
  MaximizeTapButton,
  ArrowDownUpTapButton,
  BellTapButton,
  UploadTapButton,
  UndoTapButton,
  RedoTapButton,
  CopyTapButton,
  TrashTapButton,
  ChevronLeftTapButton,
  PanelLeftTapButton,
  PanelRightTapButton,
  SquarePenTapButton,
  XTapButton,
  FilterTapButton,
  PlayTapButton,
  PauseTapButton,
  StopTapButton,
  Volume2TapButton,
  ArrowUpTapButton,
  MicTapButton,
  MicOffTapButton,
  BugTapButton,
  SaveTapButton,
  SendTapButton,
  MessageTapButton,
  VariableTapButton,
  WrenchTapButton,
  CommandTapButton,
  TerminalTapButton,
  TestTubeTapButton,
  ResetTapButton,
  ClearTapButton,
  RetryTapButton,
  LoadingTapButton,
  RobotTapButton,
} from "@/components/icons/tap-buttons";

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

      {/* ------------------------------------------------------------------ */}

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">All Icons — Glass (default)</h2>
        <p className="text-sm text-muted-foreground">
          Every general-purpose tap button at default glass variant.
        </p>
        <div className="flex flex-wrap">
          <MenuTapButton />
          <PlusTapButton />
          <SearchTapButton />
          <SettingsTapButton />
          <Settings2TapButton />
          <MaximizeTapButton />
          <ArrowDownUpTapButton />
          <BellTapButton />
          <UploadTapButton />
          <UndoTapButton />
          <RedoTapButton />
          <CopyTapButton />
          <TrashTapButton />
          <ChevronLeftTapButton />
          <PanelLeftTapButton />
          <PanelRightTapButton />
          <SquarePenTapButton />
          <XTapButton />
          <FilterTapButton />
          <PlayTapButton />
          <PauseTapButton />
          <StopTapButton />
          <Volume2TapButton />
          <ArrowUpTapButton />
          <MicTapButton />
          <MicOffTapButton />
          <BugTapButton />
          <SaveTapButton />
          <SendTapButton />
          <MessageTapButton />
          <VariableTapButton />
          <WrenchTapButton />
          <CommandTapButton />
          <TerminalTapButton />
          <TestTubeTapButton />
          <ResetTapButton />
          <ClearTapButton />
          <RetryTapButton />
          <LoadingTapButton />
          <RobotTapButton />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">All Icons — Transparent</h2>
        <p className="text-sm text-muted-foreground">
          Same set with variant=&quot;transparent&quot; — hover shows a muted
          bg, no glass border.
        </p>
        <div className="flex flex-wrap">
          <MenuTapButton variant="transparent" />
          <PlusTapButton variant="transparent" />
          <SearchTapButton variant="transparent" />
          <SettingsTapButton variant="transparent" />
          <Settings2TapButton variant="transparent" />
          <MaximizeTapButton variant="transparent" />
          <ArrowDownUpTapButton variant="transparent" />
          <BellTapButton variant="transparent" />
          <UploadTapButton variant="transparent" />
          <UndoTapButton variant="transparent" />
          <RedoTapButton variant="transparent" />
          <CopyTapButton variant="transparent" />
          <TrashTapButton variant="transparent" />
          <ChevronLeftTapButton variant="transparent" />
          <PanelLeftTapButton variant="transparent" />
          <PanelRightTapButton variant="transparent" />
          <SquarePenTapButton variant="transparent" />
          <XTapButton variant="transparent" />
          <FilterTapButton variant="transparent" />
          <PlayTapButton variant="transparent" />
          <PauseTapButton variant="transparent" />
          <StopTapButton variant="transparent" />
          <Volume2TapButton variant="transparent" />
          <ArrowUpTapButton variant="transparent" />
          <MicTapButton variant="transparent" />
          <MicOffTapButton variant="transparent" />
          <BugTapButton variant="transparent" />
          <SaveTapButton variant="transparent" />
          <SendTapButton variant="transparent" />
          <MessageTapButton variant="transparent" />
          <VariableTapButton variant="transparent" />
          <WrenchTapButton variant="transparent" />
          <CommandTapButton variant="transparent" />
          <TerminalTapButton variant="transparent" />
          <TestTubeTapButton variant="transparent" />
          <ResetTapButton variant="transparent" />
          <ClearTapButton variant="transparent" />
          <RetryTapButton variant="transparent" />
          <LoadingTapButton variant="transparent" />
          <RobotTapButton variant="transparent" />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">All Icons — Group</h2>
        <p className="text-sm text-muted-foreground">
          Same set inside a TapTargetButtonGroup — smaller, tighter, single pill
          border.
        </p>
        <TapTargetButtonGroup>
          <MenuTapButton variant="group" />
          <PlusTapButton variant="group" />
          <SearchTapButton variant="group" />
          <SettingsTapButton variant="group" />
          <Settings2TapButton variant="group" />
          <MaximizeTapButton variant="group" />
          <ArrowDownUpTapButton variant="group" />
          <BellTapButton variant="group" />
          <UploadTapButton variant="group" />
          <UndoTapButton variant="group" />
          <RedoTapButton variant="group" />
          <CopyTapButton variant="group" />
          <TrashTapButton variant="group" />
          <ChevronLeftTapButton variant="group" />
          <PanelLeftTapButton variant="group" />
          <PanelRightTapButton variant="group" />
          <SquarePenTapButton variant="group" />
          <XTapButton variant="group" />
          <FilterTapButton variant="group" />
          <PlayTapButton variant="group" />
          <PauseTapButton variant="group" />
          <StopTapButton variant="group" />
          <Volume2TapButton variant="group" />
          <ArrowUpTapButton variant="group" />
          <MicTapButton variant="group" />
          <MicOffTapButton variant="group" />
          <BugTapButton variant="group" />
          <SaveTapButton variant="group" />
          <SendTapButton variant="group" />
          <MessageTapButton variant="group" />
          <VariableTapButton variant="group" />
          <WrenchTapButton variant="group" />
          <CommandTapButton variant="group" />
          <TerminalTapButton variant="group" />
          <TestTubeTapButton variant="group" />
          <ResetTapButton variant="group" />
          <ClearTapButton variant="group" />
          <RetryTapButton variant="group" />
          <LoadingTapButton variant="group" />
          <RobotTapButton variant="group" />
        </TapTargetButtonGroup>
      </section>
    </div>
  );
}
