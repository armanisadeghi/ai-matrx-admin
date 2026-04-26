/**
 * popoutDragDetector.test.ts — pure logic for "is this drag a pop-out
 * gesture?" Covers the threshold + dwell state machine.
 */
import {
  evaluateDragOut,
  DEFAULT_DRAG_OUT_CONFIG,
  INITIAL_DRAG_OUT_STATE,
  type DragOutState,
  type DragOutConfig,
} from "@/features/window-panels/popout/popoutDragDetector";

const CFG: DragOutConfig = { ...DEFAULT_DRAG_OUT_CONFIG };
const VPW = 1280;
const VPH = 800;

describe("evaluateDragOut", () => {
  describe("inside viewport", () => {
    it("returns initial state when cursor is at center", () => {
      const result = evaluateDragOut(
        { clientX: 640, clientY: 400 },
        INITIAL_DRAG_OUT_STATE,
        CFG,
        VPW,
        VPH,
        1000,
      );
      expect(result.state.isCandidate).toBe(false);
      expect(result.state.outsideSinceMs).toBeNull();
      expect(result.shouldTrigger).toBe(false);
    });

    it("returns initial state when cursor is just past edge but within threshold", () => {
      // 30px past right edge — less than the 80px threshold
      const result = evaluateDragOut(
        { clientX: VPW + 30, clientY: 400 },
        INITIAL_DRAG_OUT_STATE,
        CFG,
        VPW,
        VPH,
        1000,
      );
      expect(result.state.isCandidate).toBe(false);
      expect(result.state.outsideSinceMs).toBeNull();
    });

    it("resets outsideSinceMs when cursor returns inside", () => {
      const prev: DragOutState = {
        isCandidate: false,
        outsideSinceMs: 1000,
      };
      const result = evaluateDragOut(
        { clientX: 640, clientY: 400 },
        prev,
        CFG,
        VPW,
        VPH,
        1100,
      );
      expect(result.state.outsideSinceMs).toBeNull();
    });

    it("resets isCandidate when cursor returns inside", () => {
      const prev: DragOutState = {
        isCandidate: true,
        outsideSinceMs: 1000,
      };
      const result = evaluateDragOut(
        { clientX: 640, clientY: 400 },
        prev,
        CFG,
        VPW,
        VPH,
        2000,
      );
      expect(result.state.isCandidate).toBe(false);
      expect(result.state.outsideSinceMs).toBeNull();
    });
  });

  describe("crossing the threshold", () => {
    it("starts the dwell timer on first frame past threshold", () => {
      const result = evaluateDragOut(
        { clientX: VPW + 100, clientY: 400 },
        INITIAL_DRAG_OUT_STATE,
        CFG,
        VPW,
        VPH,
        1000,
      );
      expect(result.state.outsideSinceMs).toBe(1000);
      expect(result.state.isCandidate).toBe(false); // dwell not yet met
      expect(result.shouldTrigger).toBe(false);
    });

    it("preserves outsideSinceMs across consecutive outside frames", () => {
      let s = INITIAL_DRAG_OUT_STATE;
      // First frame outside @ t=1000
      let r = evaluateDragOut(
        { clientX: VPW + 100, clientY: 400 },
        s,
        CFG,
        VPW,
        VPH,
        1000,
      );
      s = r.state;
      // Second frame outside @ t=1100 — still under 250ms dwell
      r = evaluateDragOut(
        { clientX: VPW + 200, clientY: 400 },
        s,
        CFG,
        VPW,
        VPH,
        1100,
      );
      expect(r.state.outsideSinceMs).toBe(1000);
      expect(r.state.isCandidate).toBe(false);
    });

    it("becomes candidate after dwellMs elapses", () => {
      let s = INITIAL_DRAG_OUT_STATE;
      let r = evaluateDragOut(
        { clientX: VPW + 100, clientY: 400 },
        s,
        CFG,
        VPW,
        VPH,
        1000,
      );
      s = r.state;
      // 250ms later — exactly at the dwell boundary
      r = evaluateDragOut(
        { clientX: VPW + 100, clientY: 400 },
        s,
        CFG,
        VPW,
        VPH,
        1250,
      );
      expect(r.state.isCandidate).toBe(true);
      expect(r.shouldTrigger).toBe(true); // edge-trigger fires once
    });

    it("shouldTrigger only fires on the candidate transition, not while latched", () => {
      let s = INITIAL_DRAG_OUT_STATE;
      let r = evaluateDragOut(
        { clientX: VPW + 100, clientY: 400 },
        s,
        CFG,
        VPW,
        VPH,
        1000,
      );
      s = r.state;
      r = evaluateDragOut(
        { clientX: VPW + 100, clientY: 400 },
        s,
        CFG,
        VPW,
        VPH,
        1250,
      );
      s = r.state;
      // Already candidate — next frame still outside should NOT re-trigger
      r = evaluateDragOut(
        { clientX: VPW + 200, clientY: 400 },
        s,
        CFG,
        VPW,
        VPH,
        1300,
      );
      expect(r.state.isCandidate).toBe(true);
      expect(r.shouldTrigger).toBe(false);
    });
  });

  describe("each viewport edge", () => {
    const cases: Array<{
      name: string;
      x: number;
      y: number;
    }> = [
      { name: "left", x: -100, y: 400 },
      { name: "right", x: VPW + 100, y: 400 },
      { name: "top", x: 640, y: -100 },
      { name: "bottom", x: 640, y: VPH + 100 },
    ];
    cases.forEach(({ name, x, y }) => {
      it(`detects exit past the ${name} edge`, () => {
        const r = evaluateDragOut(
          { clientX: x, clientY: y },
          INITIAL_DRAG_OUT_STATE,
          CFG,
          VPW,
          VPH,
          1000,
        );
        expect(r.state.outsideSinceMs).toBe(1000);
      });
    });
  });

  describe("interrupted dwell", () => {
    it("a frame back inside resets the dwell timer", () => {
      let s = INITIAL_DRAG_OUT_STATE;
      // Outside @ t=1000
      let r = evaluateDragOut(
        { clientX: VPW + 100, clientY: 400 },
        s,
        CFG,
        VPW,
        VPH,
        1000,
      );
      s = r.state;
      // Back inside @ t=1100
      r = evaluateDragOut(
        { clientX: 640, clientY: 400 },
        s,
        CFG,
        VPW,
        VPH,
        1100,
      );
      s = r.state;
      expect(s.outsideSinceMs).toBeNull();
      // Outside again @ t=1200 — fresh dwell starts now
      r = evaluateDragOut(
        { clientX: VPW + 100, clientY: 400 },
        s,
        CFG,
        VPW,
        VPH,
        1200,
      );
      expect(r.state.outsideSinceMs).toBe(1200);
      expect(r.state.isCandidate).toBe(false);
      // 200ms later — still not enough
      r = evaluateDragOut(
        { clientX: VPW + 100, clientY: 400 },
        r.state,
        CFG,
        VPW,
        VPH,
        1400,
      );
      expect(r.state.isCandidate).toBe(false);
    });
  });

  describe("custom config", () => {
    it("respects a custom outsideThreshold", () => {
      const cfg: DragOutConfig = { outsideThreshold: 200, dwellMs: 250 };
      // 100px past edge — under custom 200px threshold
      const r = evaluateDragOut(
        { clientX: VPW + 100, clientY: 400 },
        INITIAL_DRAG_OUT_STATE,
        cfg,
        VPW,
        VPH,
        1000,
      );
      expect(r.state.outsideSinceMs).toBeNull();
    });

    it("respects a custom dwellMs", () => {
      const cfg: DragOutConfig = { outsideThreshold: 80, dwellMs: 500 };
      let s = INITIAL_DRAG_OUT_STATE;
      let r = evaluateDragOut(
        { clientX: VPW + 100, clientY: 400 },
        s,
        cfg,
        VPW,
        VPH,
        1000,
      );
      s = r.state;
      // 250ms later — would be candidate under default cfg, but not under 500ms
      r = evaluateDragOut(
        { clientX: VPW + 100, clientY: 400 },
        s,
        cfg,
        VPW,
        VPH,
        1250,
      );
      expect(r.state.isCandidate).toBe(false);
      // 500ms — now candidate
      r = evaluateDragOut(
        { clientX: VPW + 100, clientY: 400 },
        s,
        cfg,
        VPW,
        VPH,
        1500,
      );
      expect(r.state.isCandidate).toBe(true);
    });
  });
});
