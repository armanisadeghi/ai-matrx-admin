import type { PlaygroundDemo } from "../types";

/** three + @react-three/fiber: shelf heights from data as a 3D bar field. */
const source = String.raw`import React from "react";
import { Boxes } from "lucide-react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { KindHeaderBar } from "@/components/kind-kit/KindHeaderBar";
import { KindPanel } from "@/components/kind-kit/KindPanel";
import { StreamingSkeleton, useStreamingValue, streamList } from "@/components/kind-kit/StreamingSkeleton";

function Shelves({ bays }) {
  const group = React.useRef(null);
  useFrame((_, delta) => {
    if (group.current) group.current.rotation.y += delta * 0.25;
  });
  const max = Math.max(1, ...bays.map((bay) => Number(bay.units) || 0));
  return (
    <group ref={group}>
      {bays.map((bay, index) => {
        const height = 0.2 + ((Number(bay.units) || 0) / max) * 2.4;
        const x = (index % 4) * 1.1 - 1.65;
        const z = Math.floor(index / 4) * 1.1 - 0.55;
        return (
          <mesh key={bay.code ?? index} position={[x, height / 2, z]}>
            <boxGeometry args={[0.8, height, 0.8]} />
            <meshStandardMaterial color={new THREE.Color().setHSL(0.58, 0.55, 0.35 + (height / 2.6) * 0.3)} />
          </mesh>
        );
      })}
    </group>
  );
}

export default function Warehouse3d({ data }) {
  const { value: site, arrived } = useStreamingValue(data?.site, "");
  const bays = streamList(data?.bays).filter((bay) => bay && bay.code);
  if (!arrived && bays.length === 0) return <StreamingSkeleton layout="cards" rows={2} />;
  const units = bays.reduce((sum, bay) => sum + (Number(bay.units) || 0), 0);
  return (
    <div className="@container flex flex-col gap-2">
      <KindHeaderBar
        title={site || "Warehouse"}
        icon={Boxes}
        stats={[{ label: "bays", value: bays.length }, { label: "units", value: units }]}
        copy={{ label: "Warehouse stock", human: () => bays.map((b) => b.code + ": " + b.units).join("\n"), json: () => data }}
      />
      <KindPanel title="Stock by bay" icon={Boxes} count={bays.length}>
        <div className="h-64 w-full rounded-md bg-muted/40">
          <Canvas camera={{ position: [4, 4, 5], fov: 45 }}>
            <ambientLight intensity={0.6} />
            <directionalLight position={[5, 8, 5]} intensity={0.9} />
            <Shelves bays={bays} />
          </Canvas>
        </div>
      </KindPanel>
    </div>
  );
}
`;

export const WAREHOUSE_3D_DEMO: PlaygroundDemo = {
  slug: "playground_warehouse_3d",
  title: "Warehouse 3D",
  covers: ["three", "@react-three/fiber"],
  source,
  sample: {
    site: "Reno fulfillment center, aisle C",
    bays: [
      { code: "C-01", units: 420 },
      { code: "C-02", units: 310 },
      { code: "C-03", units: 95 },
      { code: "C-04", units: 505 },
      { code: "C-05", units: 260 },
      { code: "C-06", units: 180 },
      { code: "C-07", units: 470 },
      { code: "C-08", units: 60 },
    ],
  },
};
