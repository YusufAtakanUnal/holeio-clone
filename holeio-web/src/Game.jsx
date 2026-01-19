import { Canvas, useFrame } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { Suspense, useRef, useMemo, useState, useEffect } from "react";
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
function Scene({ level, onScoreUpdate, holeRadius: radius, progress }) {
  const keys = useKeyboard();
  const bodiesRef = useRef(new Map());
  const eatenRef = useRef(new Set());
  const worldOffset = useRef({ x: 0, z: 0 });

  const { movement, arena, camera } = GAME_CONFIG;

  // Level'den verileri al
  // radius is now passed from props
  const theme = level.theme;

  // Binaları ve tile'ları oluştur
  // Binaları ve tile'ları oluştur
  const buildings = useMemo(() => level.generateBuildings(), [level]);
  const props = useMemo(() => level.generateProps ? level.generateProps() : [], [level]);

  // Merge all objects for unified lookup and rendering
  const allObjects = useMemo(() => [...buildings, ...props], [buildings, props]);

  const roadTiles = useMemo(() => level.generateRoadTiles(), [level]);

  const registerBody = (id, rb) => {
    if (rb) bodiesRef.current.set(id, rb);
  };

  const handleEaten = (id) => {
    if (eatenRef.current.has(id)) return; // Prevent double counting
    eatenRef.current.add(id);

    const object = allObjects.find((b) => b.id === id);
    if (object) {
      // Map Bounds Check: Only award points if inside the valid map area
      // This allows objects anywhere on the map to be eaten, but ignores "void falls" (e.g. at infinity)
      const dist = Math.hypot(object.pos[0], object.pos[2]);

      // CRITICAL FIX: Check Y-axis too!
      // If object fell deep into void (y < -5) and is far from hole, IGNORE IT.
      // Real "eaten" objects are near y=0 or y < 0 but CLOSE to hole center.
      const isDeepVoid = object.pos[1] < -5 && dist > radius + 2;

      if (!isDeepVoid && dist < arena.floorSize / 2 - 10) {
        if (onScoreUpdate) onScoreUpdate(object.points || 5);
      }
    }
  };

  // Movement
  useFrame((state, delta) => {
    // ... (rest of movement code is fine, skipping lines for brevity if possible, keeping Context)
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
      {/* Use radius as key to force remount when size changes */}
      <PhysicsGround key={`ground-${radius}`} radius={radius} floorSize={arena.floorSize} />

      {/* Hole */}
      <HoleWell key={`well-${radius}`} radius={radius} depth={40} />
      <HoleVisual radius={radius} progress={progress} />

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

      {/* Unified Objects (Buildings + Props) */}
      {allObjects
        .filter(obj => Math.hypot(obj.pos[0], obj.pos[2]) > radius + 8) // GLOBAL SAFETY CHECK
        .map((obj) => (
          <Building
            key={obj.id}
            id={obj.id}
            position={obj.pos}
            name={obj.name}
            size={obj.size}
            dir={obj.dir || "buildings"}
            rotation={obj.rotation || 0}
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

  // Game State
  const [score, setScore] = useState(0);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [holeRadius, setHoleRadius] = useState(level.hole.radius);

  // Reset state when level changes
  useEffect(() => {
    setScore(0);
    setCurrentLevel(1);
    setHoleRadius(level.hole.radius);
  }, [level]);

  // Growth Config
  const POINTS_PER_LEVEL = 50; // Points needed for next level
  const RADIUS_GROWTH = 0.5;   // How much to grow per level

  // Calculate progress (0 to 1) for the current level
  // Level 1: 0-50 pts
  // Level 2: 50-100 pts (relative 0-50)
  // ...
  const levelStartScore = (currentLevel - 1) * POINTS_PER_LEVEL;
  const nextLevelScore = currentLevel * POINTS_PER_LEVEL;
  const progress = Math.min(
    Math.max((score - levelStartScore) / (nextLevelScore - levelStartScore), 0),
    1
  );

  // Grace period to prevent instant spawn-kills on load
  const [isGameActive, setIsGameActive] = useState(false);

  useEffect(() => {
    setIsGameActive(false);
    const timer = setTimeout(() => setIsGameActive(true), 1500);
    return () => clearTimeout(timer);
  }, [level]);

  const handleScoreUpdate = (points) => {
    if (!isGameActive) return; // IGNORE SCORE DURING WARMUP

    // Call parent handler if exists (for UI etc)
    if (onScoreUpdate) onScoreUpdate(points);

    setScore(prev => {
      const newScore = prev + points;

      // Check for level up
      const calculatedLevel = Math.floor(newScore / POINTS_PER_LEVEL) + 1;

      if (calculatedLevel > currentLevel) {
        setCurrentLevel(calculatedLevel);
        setHoleRadius(level.hole.radius + (calculatedLevel - 1) * RADIUS_GROWTH);
      }

      return newScore;
    });
  };

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
            <Scene
              level={level}
              onScoreUpdate={handleScoreUpdate}
              holeRadius={holeRadius}
              progress={progress}
            />
          </Physics>
        </Suspense>
      </Canvas>
    </div>
  );
}
