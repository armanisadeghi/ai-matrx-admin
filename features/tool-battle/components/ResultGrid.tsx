import { useState } from "react";
import { Clock } from "lucide-react";
import { useNow } from "../useBattleData";
import { lanePlaces, marks, type Mark } from "../derive";
import type { BattleView, CellView, Lane } from "../types";
import { CellDetail } from "./CellDetail";
import { CellTile } from "./CellTile";
import { LaneCard } from "./LaneCard";

/** Lane cards across the top, one row per subject, one tile per lane × subject. */
export function ResultGrid({
  battle,
  cells,
  lanes,
  revealed,
}: {
  battle: BattleView;
  cells: CellView[];
  lanes: Lane[];
  revealed: boolean;
}) {
  const [open, setOpen] = useState<CellView | null>(null);
  const now = useNow(5000);
  const rollups = battle.summary?.lanes ?? {};
  const places = lanePlaces(rollups);
  const markFor = (id: string): Record<keyof typeof places, Mark> => ({
    success: marks(places.success)[id] ?? null,
    speed: marks(places.speed)[id] ?? null,
    cost: marks(places.cost)[id] ?? null,
    fields: marks(places.fields)[id] ?? null,
  });
  const ranking = battle.summary?.ranking ?? [];
  const byKey = new Map(cells.map((c) => [`${c.laneId}|${c.subjectId}`, c]));
  const columns = { gridTemplateColumns: `minmax(9rem,12rem) repeat(${lanes.length}, minmax(14rem,1fr))` };
  const hideCost = battle.blind && !revealed;

  return (
    <>
      <div className="shrink-0 overflow-x-auto pb-1">
        <div className="grid min-w-max gap-2" style={columns}>
          <div className="flex items-end pb-1 text-xs font-medium text-muted-foreground">
            <Clock className="mr-1 size-3.5" />
            {battle.subjects.length} {battle.subjects.length === 1 ? "subject" : "subjects"}
          </div>
          {lanes.map((lane) => {
            const place = ranking.indexOf(lane.lane_id);
            return (
              <LaneCard
                key={lane.lane_id}
                battle={battle}
                lane={lane}
                rollup={rollups[lane.lane_id]}
                marks={markFor(lane.lane_id)}
                revealed={revealed}
                place={place >= 0 && !(battle.blind && !revealed) ? place + 1 : null}
              />
            );
          })}
          {battle.subjects.map((subject) => (
            <div key={subject.subject_id} className="contents">
              <div className="flex min-w-0 flex-col justify-center py-1">
                <span className="truncate text-sm font-medium text-foreground">{subject.label}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {Object.values(subject.inputs).map(String).join(" · ")}
                </span>
              </div>
              {lanes.map((lane) => (
                <CellTile
                  key={lane.lane_id}
                  cell={byKey.get(`${lane.lane_id}|${subject.subject_id}`)}
                  hideCost={hideCost}
                  now={now}
                  onOpen={setOpen}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      <CellDetail battle={battle} cell={open} revealed={revealed} onClose={() => setOpen(null)} />
    </>
  );
}
