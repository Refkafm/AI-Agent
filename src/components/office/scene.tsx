"use client";
import {
  Component,
  useEffect,
  useRef,
  type ReactNode,
  type ComponentRef,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  OrbitControls,
  OrthographicCamera,
  PerspectiveCamera,
} from "@react-three/drei";
import * as THREE from "three";
import Building from "./building";
import { Character, Label, Box } from "./models";
import { rooms, type RoomId } from "@/lib/rooms";
import type { Agent, AgentId } from "@/lib/domain";
export type ViewCommand = {
  kind: "zoomIn" | "zoomOut" | "rotate" | "reset";
  seq: number;
};
export type Direction = "forward" | "back" | "left" | "right" | null;
type Props = {
  room: RoomId;
  floor: "both" | "main" | "basement";
  inside: boolean;
  paused: boolean;
  labels: boolean;
  command: ViewCommand;
  direction: Direction;
  agents: Agent[];
  onRoom: (id: RoomId) => void;
  onAgent: (id: AgentId | "supervisor") => void;
};
const homes: [number, number, number][] = [
  [0, -3.3, 2.25],
  [-2.5, 0, 1.1],
  [0, 0, 1.1],
  [2.5, 0, 1.1],
  [-5.1, 0, -2.5],
];
// Explicit corridor waypoints keep decorative walkers clear of room partitions and furniture.
const paths: [number, number, number][][] = [
  [
    [0, -3.3, 2.25],
    [1.5, -3.3, 2.25],
    [1.5, -3.3, 3.5],
    [0, -3.3, 3.5],
  ],
  [
    [-2.5, 0, 1.1],
    [-2.5, 0, 2.8],
    [-3.3, 0, 3.4],
    [-5, 0, 3.4],
  ],
  [
    [0, 0, 1.1],
    [0, 0, 2.8],
    [3.4, 0, 2.8],
    [3.4, 0, -1],
    [5.5, 0, -1],
    [5.5, 0, -2.2],
  ],
  [
    [2.5, 0, 1.1],
    [2.5, 0, 3.4],
    [4.5, 0, 3.4],
    [5.3, 0, 3.6],
  ],
  [
    [-5.1, 0, -2.5],
    [-4.9, 0, -1.7],
    [-4.9, 0, -1],
    [-3.3, 0, -1],
    [-3.3, 0, 2.8],
    [0, 0, 2.8],
  ],
];
function Walker({
  index,
  paused,
  labels,
  name,
  onClick,
}: {
  index: number;
  paused: boolean;
  labels: boolean;
  name: string;
  onClick: () => void;
}) {
  const ref = useRef<THREE.Group>(null);
  const clock = useRef(index * 5);
  const limb = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (paused || !ref.current) return;
    clock.current += Math.min(dt, 0.05);
    const time = clock.current % 70;
    const points = paths[index];
    if (time < 18) {
      ref.current.position.set(...homes[index]);
      ref.current.rotation.y = Math.PI;
    } else {
      const t = (time - 18) / 52;
      const loop = [...points, ...points.slice(0, -1).reverse()];
      const f = t * (loop.length - 1);
      const a = loop[Math.floor(f)];
      const b = loop[Math.min(Math.floor(f) + 1, loop.length - 1)];
      ref.current.position.lerpVectors(
        new THREE.Vector3(...a),
        new THREE.Vector3(...b),
        Math.min(1, (f % 1) / 0.72),
      );
      ref.current.rotation.y = Math.atan2(b[0] - a[0], b[2] - a[2]);
      ref.current.position.y += Math.abs(Math.sin(time * 7)) * 0.025;
    }
    if (limb.current)
      limb.current.rotation.z = Math.sin(clock.current * 3) * 0.025;
  });
  return (
    <group
      ref={ref}
      position={homes[index]}
      rotation={[0, Math.PI, 0]}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <group ref={limb}>
        <Character
          kind={["owl", "fox", "cat", "rabbit", "human"][index]}
          color={["#ab8dc3", "#dca271", "#f1dfc1", "#f4eef5"][index]}
          shirt={["#78718e", "#859dc5", "#d4b975", "#bc9dce", "#aabdb2"][index]}
          human={index === 4}
          paused={paused}
        />
      </group>
      {labels && <Label p={[0, 1.85, 0]}>{name}</Label>}
    </group>
  );
}
function CameraControl({
  inside,
  room,
  command,
  direction,
}: {
  inside: boolean;
  room: RoomId;
  command: ViewCommand;
  direction: Direction;
}) {
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const { camera, size } = useThree();
  const yaw = useRef(0);
  const keys = useRef(new Set<string>());
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).matches("input,textarea,select")) return;
      if (
        [
          "ArrowUp",
          "ArrowDown",
          "ArrowLeft",
          "ArrowRight",
          "w",
          "a",
          "s",
          "d",
        ].includes(e.key)
      ) {
        e.preventDefault();
        keys.current.add(e.key);
      }
    };
    const up = (e: KeyboardEvent) => keys.current.delete(e.key);
    const clear = () => keys.current.clear();
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", clear);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", clear);
    };
  }, []);
  useEffect(() => {
    const p = rooms.find((r) => r.id === room)?.point ?? [0, 0, 0];
    if (inside) {
      camera.position.set(p[0], p[1] + 1.65, p[2] + 1.1);
      yaw.current = 0;
      camera.lookAt(p[0], p[1] + 1.5, p[2] - 2);
    } else {
      camera.position.set(19, 17, 23);
      if (controls.current) {
        controls.current.target.set(
          room === "all" ? 0 : p[0] * 0.25,
          room === "astra" ? -2 : 0,
          0,
        );
        controls.current.update();
      }
      if (camera instanceof THREE.OrthographicCamera) {
        camera.zoom = Math.min(size.width / 24, size.height / 19);
        camera.updateProjectionMatrix();
      }
    }
  }, [inside, room, camera, size.width, size.height]);
  useEffect(() => {
    if (inside) return;
    const c = controls.current;
    if (!c) return;
    if (command.kind === "reset") {
      camera.position.set(19, 17, 23);
      c.target.set(0, 0, 0);
      if (camera instanceof THREE.OrthographicCamera)
        camera.zoom = Math.min(size.width / 24, size.height / 19);
    } else if (command.kind === "rotate") {
      const offset = camera.position
        .clone()
        .sub(c.target)
        .applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 6);
      camera.position.copy(c.target).add(offset);
    } else if (camera instanceof THREE.OrthographicCamera) {
      camera.zoom = THREE.MathUtils.clamp(
        camera.zoom * (command.kind === "zoomIn" ? 1.2 : 1 / 1.2),
        12,
        130,
      );
    }
    camera.updateProjectionMatrix();
    c.update();
  }, [command, inside, camera, size]);
  useFrame((_, delta) => {
    if (!inside) return;
    const dt = Math.min(delta, 0.05);
    const k = keys.current;
    if (k.has("ArrowLeft") || k.has("a") || direction === "left")
      yaw.current += dt * 1.5;
    if (k.has("ArrowRight") || k.has("d") || direction === "right")
      yaw.current -= dt * 1.5;
    const movement =
      (k.has("ArrowUp") || k.has("w") || direction === "forward" ? 1 : 0) -
      (k.has("ArrowDown") || k.has("s") || direction === "back" ? 1 : 0);
    const dx = -Math.sin(yaw.current) * movement * dt * 2;
    const dz = -Math.cos(yaw.current) * movement * dt * 2;
    const nx = camera.position.x + dx,
      nz = camera.position.z + dz;
    const basement = room === "astra";
    const inBounds = basement
      ? Math.abs(nx) < 5.1 && nz > -1.3 && nz < 4.5
      : Math.abs(nx) < 7.6 && nz > -5.1 && nz < 5.1;
    const hitsPartition =
      !basement &&
      (((Math.abs(nx + 4) < 0.18 || Math.abs(nx - 4) < 0.18) &&
        nz > -0.9 &&
        nz < 3.15) ||
        ((Math.abs(nx + 2.6) < 0.18 || Math.abs(nx - 2.6) < 0.18) &&
          nz < -1.6) ||
        (Math.abs(nz + 1.5) < 0.18 &&
          ![-5.2, 0, 5.2].some((x) => nx > x - 0.68 && nx < x + 1.28)));
    if (inBounds && !hitsPartition) {
      camera.position.x = nx;
      camera.position.z = nz;
    }
    camera.lookAt(
      camera.position.x - Math.sin(yaw.current),
      camera.position.y - 0.07,
      camera.position.z - Math.cos(yaw.current),
    );
  });
  return inside ? null : (
    <OrbitControls
      ref={controls}
      makeDefault
      enableDamping
      minZoom={12}
      maxZoom={130}
      maxPolarAngle={Math.PI / 2.1}
      minPolarAngle={0.2}
      target={[0, 0, 0]}
      mouseButtons={{
        LEFT: THREE.MOUSE.ROTATE,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.PAN,
      }}
    />
  );
}
class SceneBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="scene-fallback">
        <h2>3D tidak tersedia di browser ini</h2>
        <p>
          Aktifkan hardware acceleration atau gunakan browser dengan WebGL.
          Agents dan Tasks tetap bisa digunakan.
        </p>
      </div>
    ) : (
      this.props.children
    );
  }
}
export default function OfficeScene(props: Props) {
  const effectiveFloor = props.inside
    ? props.room === "astra"
      ? "basement"
      : "main"
    : props.floor;
  return (
    <SceneBoundary>
      <Canvas
        shadows
        dpr={[1, 1.5]}
        gl={{ antialias: true }}
        onContextMenu={(e) => e.preventDefault()}
        fallback={
          <div className="scene-fallback">
            WebGL tidak tersedia. Gunakan tab Agents dan Tasks.
          </div>
        }
      >
        <color attach="background" args={["#f7f6f2"]} />
        {props.inside ? (
          <PerspectiveCamera makeDefault fov={65} />
        ) : (
          <OrthographicCamera
            makeDefault
            position={[19, 17, 23]}
            zoom={35}
            near={0.1}
            far={150}
          />
        )}
        <ambientLight intensity={1.3} />
        <hemisphereLight args={["#fffaf0", "#c7bcd1", 1.5]} />
        <directionalLight
          castShadow
          position={[-8, 18, 10]}
          intensity={2.1}
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-15}
          shadow-camera-right={15}
          shadow-camera-top={15}
          shadow-camera-bottom={-15}
          shadow-normalBias={0.035}
        />
        <Building
          paused={props.paused}
          selected={props.room}
          onRoom={props.onRoom}
          floor={effectiveFloor}
        />
        {[0, 1, 2, 3, 4]
          .filter((i) =>
            i === 0 ? effectiveFloor !== "main" : effectiveFloor !== "basement",
          )
          .map((i) => (
            <Walker
              key={i}
              index={i}
              name={i === 4 ? "Agent" : props.agents[i].name}
              paused={props.paused || (i < 4 && !props.agents[i].enabled)}
              labels={props.labels}
              onClick={() =>
                props.onAgent(i === 4 ? "supervisor" : props.agents[i].id)
              }
            />
          ))}
        <Box p={[0, -3.65, 0]} s={[200, 0.1, 200]} c="#f7f6f2" />
        <CameraControl
          inside={props.inside}
          room={props.room}
          command={props.command}
          direction={props.direction}
        />
      </Canvas>
    </SceneBoundary>
  );
}
