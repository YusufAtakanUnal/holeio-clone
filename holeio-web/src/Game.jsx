import { Canvas, useFrame } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { Suspense, useRef, useMemo, useState } from "react";
import * as THREE from "three";

import { useKeyboard } from "./hooks/useKeyboard";
import { RoadTile, GrassTile, Building, PhysicsGround, HoleWell, HoleVisual } from "./components";
import { GAME_CONFIG } from "./config/gameConfig";
import { LEVEL_1 } from "./levels";

// ----------------- Moving World Container -----------------
function MovingWorld({ worldOffset, children }) {
  const groupRef = useRef();

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.position.x = worldOffset.current.x;
      groupRef.current.position.z = worldOffset.current.z;
    }
  });

  return <group ref={groupRef}>{children}</group>;
}

// ----------------- Scene -----------------
function Scene({ level, onScoreUpdate }) {
  const keys = useKeyboard();
  const bodiesRef = useRef(new Map());
  const eatenRef = useRef(new Set());
  const worldOffset = useRef({ x: 0, z: 0 });

  const { movement, arena, camera } = GAME_CONFIG;

  // Level'den verileri al
  const holeRadius = level.hole.radius;
  const theme = level.theme;

  // Binaları ve tile'ları oluştur
  const buildings = useMemo(() => level.generateBuildings(), [level]);
  const roadTiles = useMemo(() => level.generateRoadTiles(), [level]);

  const registerBody = (id, rb) => {
    if (rb) bodiesRef.current.set(id, rb);
  };

  const handleEaten = (id) => {
    eatenRef.current.add(id);
    const building = buildings.find((b) => b.id === id);
    if (building && onScoreUpdate) {
      onScoreUpdate(building.points || 10);
    }
  };

  // Movement
  useFrame((state, delta) => {
    const k = keys.current;
    const dir = new THREE.Vector3(0, 0, 0);

    if (k.has("w") || k.has("arrowup")) dir.z -= 1;
    if (k.has("s") || k.has("arrowdown")) dir.z += 1;
    if (k.has("a") || k.has("arrowleft")) dir.x -= 1;
    if (k.has("d") || k.has("arrowright")) dir.x += 1;

    if (dir.lengthSq() > 0) {
      dir.normalize().multiplyScalar(movement.speed * delta);

      // Update world offset for visual elements
      worldOffset.current.x -= dir.x;
      worldOffset.current.z -= dir.z;

      // Move physics bodies
      bodiesRef.current.forEach((rb, id) => {
        if (!rb || eatenRef.current.has(id)) return;

        const t = rb.translation();
        let nx = t.x - dir.x;
        let nz = t.z - dir.z;

        // Wrap around
        if (nx > arena.wrapSize) nx -= arena.wrapSize * 2;
        if (nx < -arena.wrapSize) nx += arena.wrapSize * 2;
        if (nz > arena.wrapSize) nz -= arena.wrapSize * 2;
        if (nz < -arena.wrapSize) nz += arena.wrapSize * 2;

        rb.setTranslation({ x: nx, y: t.y, z: nz }, true);
      });
    }

    // Camera
    const camTarget = new THREE.Vector3(0, camera.height, camera.distance);
    state.camera.position.lerp(camTarget, camera.lerpSpeed);
    state.camera.lookAt(0, 0, 0);
  });

  return (
    <>
      {/* Theme settings */}
      <color attach="background" args={[theme.background]} />
      <fog attach="fog" args={[theme.fog.color, theme.fog.near, theme.fog.far]} />

      {/* Lighting */}
      <ambientLight intensity={theme.ambientLight} />
      <directionalLight position={[25, 35, 15]} intensity={theme.directionalLight} castShadow />
      <hemisphereLight intensity={0.3} groundColor={theme.background} />

      {/* Physics ground */}
      <PhysicsGround radius={holeRadius} floorSize={arena.floorSize} />

      {/* Hole */}
      <HoleWell radius={holeRadius} depth={8} />
      <HoleVisual radius={holeRadius} />

      {/* Moving visual world (ground tiles) */}
      <MovingWorld worldOffset={worldOffset}>
        {roadTiles.map((tile) =>
          theme.groundType === "grass" ? (
            <GrassTile
              key={tile.id}
              position={tile.pos}
              size={level.grid.tileSize}
              colors={theme.groundColors}
            />
          ) : (
            <RoadTile
              key={tile.id}
              position={tile.pos}
              size={level.grid.tileSize}
              colors={theme.roadColors}
            />
          )
        )}
      </MovingWorld>

      {/* Buildings / Objects */}
      {buildings.map((b) => (
        <Building
          key={b.id}
          id={b.id}
          position={b.pos}
          name={b.name}
          size={b.size}
          dir={b.dir || "buildings"}
          rotation={b.rotation || 0}
          onRegister={registerBody}
          onEaten={handleEaten}
        />
      ))}
    </>
  );
}

// ----------------- Main Game Component -----------------
export default function Game({ level = LEVEL_1, onScoreUpdate }) {
  const { camera, physics } = GAME_CONFIG;

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{
          position: [0, camera.height, camera.distance],
          fov: camera.fov,
          near: 0.1,
          far: 500,
        }}
      >
        <Suspense fallback={null}>
          <Physics gravity={[0, physics.gravity, 0]}>
            <Scene level={level} onScoreUpdate={onScoreUpdate} />
          </Physics>
        </Suspense>
      </Canvas>
    </div>
  );
}
