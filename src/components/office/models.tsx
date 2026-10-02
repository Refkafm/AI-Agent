"use client";
import { Html } from "@react-three/drei";
import { useFrame, type ThreeElements } from "@react-three/fiber";
import { useRef } from "react";
import type { Group } from "three";
type V = [number, number, number];
export function Box({
  p = [0, 0, 0],
  s = [1, 1, 1],
  c = "#eee6d8",
  ...props
}: { p?: V; s?: V; c?: string } & Omit<
  ThreeElements["mesh"],
  "position" | "scale"
>) {
  return (
    <mesh position={p} castShadow receiveShadow {...props}>
      <boxGeometry args={s} />
      <meshStandardMaterial color={c} roughness={0.85} />
    </mesh>
  );
}
export function Ball({
  p = [0, 0, 0],
  s = [1, 1, 1],
  c = "#eee6d8",
}: {
  p?: V;
  s?: V;
  c?: string;
}) {
  return (
    <mesh position={p} scale={s} castShadow>
      <sphereGeometry args={[1, 16, 12]} />
      <meshStandardMaterial color={c} roughness={0.8} />
    </mesh>
  );
}
export function Cylinder({ p, s, c }: { p: V; s: V; c: string }) {
  return (
    <mesh position={p} castShadow>
      <cylinderGeometry args={[s[0], s[1], s[2], 16]} />
      <meshStandardMaterial color={c} />
    </mesh>
  );
}
export function Label({
  children,
  p = [0, 2, 0],
}: {
  children: React.ReactNode;
  p?: V;
}) {
  return (
    <Html position={p} center style={{ pointerEvents: "none" }}>
      <span className="room-label">{children}</span>
    </Html>
  );
}
export function Plant({ p = [0, 0, 0], scale = 1 }: { p?: V; scale?: number }) {
  return (
    <group position={p} scale={scale}>
      <Cylinder p={[0, 0.22, 0]} s={[0.24, 0.18, 0.44]} c="#eee8d7" />
      <Cylinder p={[0, 0.65, 0]} s={[0.035, 0.035, 0.65]} c="#79754e" />
      {[0, 1, 2, 3, 4].map((i) => (
        <group key={i} rotation={[0, i * 1.4, 0]}>
          <Ball
            p={[0.15, 0.8 + i * 0.035, 0]}
            s={[0.16, 0.37, 0.12]}
            c={i % 2 ? "#8fa77a" : "#728c65"}
          />
        </group>
      ))}
    </group>
  );
}
export function Desk({
  p = [0, 0, 0],
  color = "#d0bddf",
  name,
  rotation = 0,
}: {
  p?: V;
  color?: string;
  name?: string;
  rotation?: number;
}) {
  return (
    <group position={p} rotation={[0, rotation, 0]}>
      <Box p={[0, 0.035, 0.3]} s={[2.2, 0.035, 1.95]} c={color} />
      <Box p={[0, 0.9, 0]} s={[1.85, 0.12, 0.85]} />
      {[-0.78, 0.78].flatMap((x) =>
        [-0.3, 0.3].map((z) => (
          <Box
            key={`${x}${z}`}
            p={[x, 0.44, z]}
            s={[0.075, 0.85, 0.075]}
            c="#b6a994"
          />
        )),
      )}
      <Box p={[0, 1.28, -0.15]} s={[0.7, 0.46, 0.055]} c="#898395" />
      <Box p={[0, 1.29, -0.111]} s={[0.61, 0.36, 0.012]} c="#e5e5ed" />
      {[0, 1, 2].map((i) => (
        <Box
          key={i}
          p={[-0.07, 1.36 - i * 0.065, -0.1]}
          s={[0.37, 0.018, 0.01]}
          c="#aaa0c1"
        />
      ))}
      <Box p={[0, 1.02, -0.15]} s={[0.06, 0.2, 0.06]} c="#898395" />
      <Box p={[0, 0.98, 0.18]} s={[0.53, 0.025, 0.2]} c="#c9c3ce" />
      <Cylinder p={[0.66, 1.04, 0.1]} s={[0.09, 0.08, 0.17]} c={color} />
      <Box p={[0, 0.48, 0.85]} s={[0.55, 0.14, 0.55]} c={color} />
      <Box p={[0, 0.76, 1.06]} s={[0.55, 0.5, 0.1]} c={color} />
      {name && <Label p={[0, 0.6, 0.62]}>{name}</Label>}
    </group>
  );
}
export function Bookshelf({ p = [0, 0, 0] }: { p?: V }) {
  return (
    <group position={p}>
      <Box p={[0, 1, 0]} s={[1.8, 2, 0.36]} c="#c7b79d" />
      {[0.3, 0.86, 1.42].map((y, row) => (
        <group key={y}>
          <Box p={[0, y - 0.12, 0.08]} s={[1.7, 0.07, 0.45]} />
          {Array.from({ length: 7 }, (_, i) => (
            <Box
              key={i}
              p={[-0.68 + i * 0.22, y + 0.12, 0.08]}
              s={[0.16, 0.35 + (i % 2) * 0.09, 0.3]}
              c={["#b5a0c9", "#dbcdad", "#a9bdb1", "#e0bcbf"][(i + row) % 4]}
            />
          ))}
        </group>
      ))}
    </group>
  );
}
export function Character({
  kind = "fox",
  color = "#d39965",
  shirt = "#899fcd",
  human = false,
  pose = 0,
  paused = false,
}: {
  kind?: string;
  color?: string;
  shirt?: string;
  human?: boolean;
  pose?: number;
  paused?: boolean;
}) {
  const arms = useRef<Group>(null);
  const elapsed = useRef(0);
  useFrame((_, dt) => {
    if (paused || !arms.current) return;
    elapsed.current += Math.min(dt, 0.05);
    arms.current.rotation.x = -0.3 + Math.sin(elapsed.current * 2) * 0.15;
  });
  return (
    <group>
      <Ball p={[0, 0.6, 0]} s={[0.25, 0.31, 0.2]} c={shirt} />
      <Ball
        p={[0, 1.05, 0]}
        s={[0.32, 0.31, 0.28]}
        c={human ? "#e5bb95" : color}
      />
      {human ? (
        <Ball p={[0, 1.23, -0.04]} s={[0.33, 0.17, 0.27]} c="#453e3c" />
      ) : kind === "rabbit" ? (
        [-0.14, 0.14].map((x) => (
          <Ball key={x} p={[x, 1.46, 0]} s={[0.085, 0.28, 0.085]} c={color} />
        ))
      ) : (
        [-0.23, 0.23].map((x) => (
          <mesh key={x} position={[x, 1.34, 0]}>
            <coneGeometry args={[0.14, 0.26, 4]} />
            <meshStandardMaterial color={color} />
          </mesh>
        ))
      )}
      {[-0.115, 0.115].map((x) => (
        <group key={x}>
          <Ball p={[x, 1.08, 0.245]} s={[0.075, 0.085, 0.033]} c="#fffcf1" />
          <Ball p={[x, 1.075, 0.277]} s={[0.033, 0.044, 0.025]} c="#373138" />
        </group>
      ))}
      <Ball p={[0, 0.97, 0.268]} s={[0.04, 0.035, 0.035]} c="#6b5049" />
      {[-1, 1].map((i) => (
        <group key={i}>
          <Ball
            p={[i * 0.12, 0.21, Math.sin(pose) * i * 0.07]}
            s={[0.11, 0.22, 0.12]}
            c="#656072"
          />
        </group>
      ))}
      <group ref={arms} position={[0, 0.75, 0]}>
        {[-1, 1].map((i) => (
          <Ball
            key={i}
            p={[i * 0.27, -0.14, 0.1]}
            s={[0.09, 0.21, 0.1]}
            c={human ? "#e5bb95" : color}
          />
        ))}
        {kind === "cat" && (
          <Box p={[0, -0.17, 0.3]} s={[0.4, 0.05, 0.25]} c="#b8a9c9" />
        )}
      </group>
      {!human && <Ball p={[0, 0.55, -0.22]} s={[0.15, 0.13, 0.23]} c={color} />}
    </group>
  );
}
