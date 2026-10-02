"use client";
import {
  Box,
  Ball,
  Cylinder,
  Desk,
  Plant,
  Bookshelf,
  Label,
  Character,
} from "./models";
import { rooms, type RoomId } from "@/lib/rooms";
export default function Building({
  onRoom,
  selected,
  floor,
  paused,
}: {
  paused: boolean;
  onRoom: (r: RoomId) => void;
  selected: RoomId;
  floor: "both" | "main" | "basement";
}) {
  return (
    <group>
      {floor !== "basement" && (
        <group>
          <Box p={[0, -0.18, 0]} s={[16, 0.35, 11]} c="#d7cbb5" />
          {Array.from({ length: 16 }, (_, x) =>
            Array.from({ length: 11 }, (_, z) => (
              <Box
                key={`${x}-${z}`}
                p={[x - 7.5, 0.008, z - 5]}
                s={[0.98, 0.025, 0.98]}
                c={(x + z) % 3 === 0 ? "#f0e8d6" : "#ede5d3"}
              />
            )),
          )}
          <Box p={[0, 1.1, -5.45]} s={[16, 2.2, 0.14]} />
          <Box p={[-7.95, 0.8, 0]} s={[0.12, 1.6, 11]} />
          <Box p={[7.95, 0.7, 0]} s={[0.12, 1.4, 11]} />
          {[-2.6, 2.6].map((x) => (
            <Box key={x} p={[x, 0.7, -3.55]} s={[0.1, 1.4, 3.7]} />
          ))}
          {[-5.2, 0, 5.2].map((x, i) => (
            <group key={x}>
              <Box
                p={[x, 0.045, -3.35]}
                s={[4.85, 0.03, 3.6]}
                c={["#ddd3e9", "#f1dfb4", "#c6ded1"][i]}
              />
              <Box p={[x, 1.4, -5.34]} s={[2.6, 1.1, 0.07]} c="#faf8f1" />
              <Box p={[x, 1.4, -5.28]} s={[2.3, 0.86, 0.04]} c="#c8dada" />
              <Box p={[x - 1.65, 0.6, -1.5]} s={[1.65, 1.2, 0.1]} />
              <Box p={[x + 1.85, 0.6, -1.5]} s={[1.25, 1.2, 0.1]} />
              <Box p={[x + 0.3, 1.45, -1.5]} s={[2.2, 0.1, 0.1]} c="#c1b8a7" />
              {[-0.75, 1.35].map((dx) => (
                <Box
                  key={dx}
                  p={[x + dx, 0.75, -1.5]}
                  s={[0.065, 1.45, 0.065]}
                  c="#c1b8a7"
                />
              ))}
              <Plant p={[x - 2, 0, -4.6]} scale={0.8} />
            </group>
          ))}
          <Desk p={[-5.1, 0, -3.4]} color="#cec2dc" />
          <Bookshelf p={[-6.8, 0, -4.9]} />
          {[-1.5, 0.5, 1.9].map((x) => (
            <Bookshelf key={x} p={[x, 0, -4.9]} />
          ))}
          <Box p={[0, 0.7, -3]} s={[2.5, 0.13, 0.7]} />
          {[-1, 1].map((x) => (
            <Box key={x} p={[x, 0.35, -3]} s={[0.1, 0.7, 0.5]} />
          ))}
          <Box p={[5.2, 0.8, -3.4]} s={[2.7, 0.15, 1.1]} />
          {[-1, 0, 1].flatMap((x) =>
            [-1, 1].map((z) => (
              <group key={`${x}${z}`}>
                <Box
                  p={[5.2 + x, 0.43, -3.4 + z * 0.9]}
                  s={[0.53, 0.13, 0.53]}
                  c="#a9c8b5"
                />
                <Box
                  p={[5.2 + x, 0.67, -3.4 + z * 1.12]}
                  s={[0.53, 0.5, 0.09]}
                  c="#a9c8b5"
                />
              </group>
            )),
          )}
          <Box p={[5.2, 1.4, -5.17]} s={[2.6, 1.1, 0.08]} c="#c3b59c" />
          <Box p={[5.2, 1.4, -5.1]} s={[2.4, 0.9, 0.02]} c="#fff9e9" />
          {[0, 1, 2, 3].map((i) => (
            <Box
              key={i}
              p={[4.4 + i * 0.5, 1.5 - (i % 2) * 0.2, -5.08]}
              s={[0.27, 0.24, 0.01]}
              c={["#d9bad0", "#e4d294", "#a8cbb4", "#bcafdb"][i]}
            />
          ))}
          <Desk p={[-2.5, 0, 0.25]} name="Rodeo" color="#bdd7c6" />
          <Desk p={[0, 0, 0.25]} name="Alpha" color="#d6c3e3" />
          <Desk p={[2.5, 0, 0.25]} name="Delta" color="#e7c3d0" />
          <Box p={[-4, 0.6, 1.15]} s={[0.1, 1.2, 3.9]} />
          <Box p={[4, 0.6, 1.15]} s={[0.1, 1.2, 3.9]} />
          <Box p={[-6, 0.025, 1.7]} s={[3.7, 0.035, 5.4]} c="#eddfba" />
          <Box p={[-6, 1, -0.6]} s={[3, 1.9, 0.35]} c="#d5c6ae" />
          {[0.6, 1.15, 1.7].map((y) => (
            <Box key={y} p={[-6, y, -0.25]} s={[2.8, 0.08, 0.7]} />
          ))}
          <Box p={[-6.05, 0.6, 1.1]} s={[2.8, 1.2, 0.65]} c="#d9c7ad" />
          <Box p={[-6.05, 1.23, 1.1]} s={[3, 0.1, 0.85]} />
          <Box p={[-6.8, 1.55, 1]} s={[0.65, 0.6, 0.5]} c="#797783" />
          <Box p={[-6.8, 1.51, 1.27]} s={[0.4, 0.25, 0.06]} c="#393940" />
          {[-5.7, -5.3].map((x) => (
            <Cylinder
              key={x}
              p={[x, 1.4, 1.1]}
              s={[0.1, 0.09, 0.2]}
              c="#faf6ec"
            />
          ))}
          {[-7, -6, -5].map((x) => (
            <group key={x}>
              <Cylinder p={[x, 0.6, 2.1]} s={[0.28, 0.28, 0.12]} c="#c9b899" />
              <Cylinder p={[x, 0.3, 2.1]} s={[0.06, 0.09, 0.6]} c="#b5a58f" />
            </group>
          ))}
          <group position={[-5.5, 0, 0.2]} rotation={[0, 0, 0]}>
            <Character
              paused={paused}
              kind="bear"
              color="#b58d68"
              shirt="#eee4cf"
            />
          </group>
          <Box p={[6, 0.03, 1.5]} s={[3.7, 0.03, 5]} c="#d6e4e8" />
          <Box p={[6, 0.55, -0.7]} s={[3, 1.1, 0.15]} />
          <Box p={[6, 1.4, -0.61]} s={[1.9, 1.1, 0.12]} c="#6e6875" />
          <Box p={[6, 1.4, -0.53]} s={[1.7, 0.9, 0.03]} c="#c1b9d3" />
          <Label p={[6, 1.45, -0.45]}>Pause & play</Label>
          <Box p={[6, 0.35, -0.25]} s={[2.5, 0.65, 0.6]} c="#d7c6ad" />
          <Box p={[7, 0.83, -0.2]} s={[0.24, 0.7, 0.34]} c="#fafafa" />
          <Box p={[7, 0.83, -0.015]} s={[0.09, 0.63, 0.03]} c="#39343e" />
          <Box p={[6, 0.45, 2.55]} s={[2.5, 0.55, 0.9]} c="#d8b3c8" />
          <Box p={[6, 0.8, 2.88]} s={[2.5, 0.8, 0.22]} c="#d8b3c8" />
          {[4.8, 7.2].map((x) => (
            <Box key={x} p={[x, 0.7, 2.5]} s={[0.25, 0.5, 0.85]} c="#d8b3c8" />
          ))}
          <Cylinder p={[6, 0.46, 1.3]} s={[0.65, 0.65, 0.12]} c="#d4bea1" />
          <Cylinder p={[6, 0.22, 1.3]} s={[0.08, 0.13, 0.45]} c="#b4a086" />
          <Box p={[5.85, 0.56, 1.3]} s={[0.25, 0.08, 0.15]} c="#f5f4f0" />
          <Ball p={[7.25, 0.3, 3.6]} s={[0.45, 0.3, 0.45]} c="#c8bbdc" />
          <Box p={[-2.8, 0.65, 4.1]} s={[0.65, 1.3, 0.65]} c="#b4a0d2" />
          <Box p={[-2.8, 1, 4.44]} s={[0.5, 0.42, 0.025]} c="#494658" />
          <Box p={[-2.8, 0.7, 4.5]} s={[0.65, 0.12, 0.35]} c="#d0c0e5" />
          {[-1.5, -0.4, 0.7].map((x, i) => (
            <Ball
              key={x}
              p={[x, 0.25, 4.25]}
              s={[0.43, 0.25, 0.46]}
              c={["#dac4dd", "#e6d7a7", "#b5d3c0"][i]}
            />
          ))}
          {[-7.4, -3.7, 3.7, 7.4].map((x) => (
            <Plant key={x} p={[x, 0, 4.6]} />
          ))}
          {[-7.7, -5, -2.5, 0, 2.5, 5, 7.7].map((x) => (
            <Box
              key={x}
              p={[x, 0.45, 5.35]}
              s={[0.05, 0.9, 0.05]}
              c="#bcb8ad"
            />
          ))}
          <Box p={[0, 0.9, 5.35]} s={[15.5, 0.05, 0.05]} c="#bcb8ad" />
          {rooms
            .filter((r) => !["all", "astra"].includes(r.id))
            .map((r) => (
              <group
                key={r.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onRoom(r.id);
                }}
              >
                <Box
                  p={[r.point[0], 0.04, r.point[2]]}
                  s={[3, 0.035, 1.7]}
                  visible={false}
                />
                <Label
                  p={[
                    r.point[0],
                    r.id === "garden" ? 0.3 : 2.2,
                    r.point[2] - 0.7,
                  ]}
                >
                  {r.name}
                </Label>
                <mesh
                  position={[r.point[0], 0.05, r.point[2]]}
                  rotation={[-Math.PI / 2, 0, 0]}
                >
                  <planeGeometry args={[3, 2]} />
                  <meshBasicMaterial
                    color="#a78ccd"
                    transparent
                    opacity={selected === r.id ? 0.12 : 0}
                    depthWrite={false}
                  />
                </mesh>
              </group>
            ))}
        </group>
      )}
      {floor !== "main" && (
        <group position={[0, -3.3, 1.6]}>
          <Box p={[0, -0.15, 0]} s={[11, 0.3, 6.6]} c="#494359" />
          <Box p={[0, 1, -3.2]} s={[11, 2, 0.15]} c="#3e3850" />
          <Box p={[-5.45, 0.8, 0]} s={[0.12, 1.6, 6.6]} c="#3e3850" />
          {Array.from({ length: 9 }, (_, i) => (
            <Box
              key={i}
              p={[0, 0.01, -2.9 + i * 0.7]}
              s={[10.8, 0.015, 0.02]}
              c="#696075"
            />
          ))}
          <Desk p={[0, 0, -0.4]} color="#80718f" />
          <Bookshelf p={[-3, 0, -2.9]} />
          <Plant p={[-4.5, 0, 1.6]} />
          <Ball p={[3.5, 0.3, 1.4]} s={[0.6, 0.3, 0.6]} c="#817190" />
          <Label p={[0, 2, -1.2]}>Astra den · Orchestrator</Label>
          <pointLight
            position={[0, 2.2, 1]}
            intensity={selected === "astra" ? 16 : 5}
            color="#dac7ff"
            distance={9}
          />
        </group>
      )}
      {floor === "both" && (
        <group>
          {Array.from({ length: 17 }, (_, i) => (
            <Box
              key={i}
              p={[8.5, -3.25 + i * 0.2, 4.7 - i * 0.25]}
              s={[1.15, 0.18, 0.3]}
              c="#cdc6d2"
            />
          ))}
          <Box p={[7, -3.2, 4.7]} s={[2.5, 0.15, 1]} c="#cdc6d2" />
        </group>
      )}
    </group>
  );
}
