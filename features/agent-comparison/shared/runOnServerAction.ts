/**
 * The battle toolbar's "Run on server" action (Agent Evaluation PLAN P4). The server run's panel
 * (checks · cost · Run on server · Pass/fail + Judge) sits at the top of the runs window
 * (`SharedRunsWindow` → `BattleTestsPanel`), so this opens that window — never closes it.
 * One definition for every mode toolbar that has a runs window.
 */

import type { HeaderAction } from "@/features/shell/components/header/variants/types";

export function runOnServerAction(runsWindowOpen: boolean, onToggleRunsWindow: () => void): HeaderAction {
  return {
    icon: "FlaskConical",
    label: "Run on server",
    onPress: () => {
      if (!runsWindowOpen) onToggleRunsWindow();
    },
  };
}
