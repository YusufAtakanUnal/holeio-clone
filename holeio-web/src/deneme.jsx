import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { Physics, RigidBody, CuboidCollider } from "@react-three/rapier";
import { Geometry, Base, Subtraction } from "@react-three/csg";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { TextureLoader } from "three";
import { useKeyboard } from "./hooks/useKeyboard";

import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader";
import { MTLLoader } from "three/examples/jsm/loaders/MTLLoader";

// ----------------- Helpers -----------------
function boxVolume(w, h, d) {
  return w * h * d;
}
const clamp01 = (x) => Math.max(0, Math.min(1, x));

function makeId(prefix, i) {
  return `${prefix}${i}`;
}
function randChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function randFloat(a, b) {
  return THREE.MathUtils.randFloat(a, b);
}
function randInt(a, b) {
  return THREE.MathUtils.randInt(a, b);
}
function inRadius(x, z, minR) {
  return x * x + z * z >= minR * minR;
}
function wrap(x, a) {
  const size = a * 2;
  if (x > a) return x - size;
  if (x < -a) return x + size;
  return x;
}

// ----------------- Ground with real hole (CSG + trimesh) -----------------
function GroundWithHole({
  radius = 2.2,
  floorSize = 160,
  floorThickness = 0.6,
  color = "#2b3442",
}) {
  const y = -floorThickness / 2;

  return (
    <RigidBody type="fixed" colliders="trimesh" friction={1} restitution={0}>
      <mesh receiveShadow position={[0, y, 0]}>
        <Geometry>
          <Base>
            <boxGeometry args={[floorSize, floorThickness, floorSize]} />
          </Base>
          <Subtraction position={[0, 0, 0]}>
            <cylinderGeometry args={[radius, radius, floorThickness * 5, 64]} />
          </Subtraction>
        </Geometry>
        <meshStandardMaterial color={color} roughness={0.98} />
      </mesh>
    </RigidBody>
  );
}

// ----------------- Cup / well walls under the hole -----------------
function CupWell({
  radius = 2.2,
  wallThickness = 0.35,
  depth = 9,
  color = "#0a0f1e",
}) {
  const outer = radius + wallThickness;
  const inner = radius;

  return (
    <RigidBody type="fixed" colliders="trimesh" friction={0.85} restitution={0}>
      <mesh castShadow receiveShadow position={[0, -depth / 2, 0]}>
        <Geometry>
          <Base>
            <cylinderGeometry args={[outer, outer, depth, 64, 1, true]} />
          </Base>
          <Subtraction>
            <cylinderGeometry args={[inner, inner, depth + 0.2, 64, 1, true]} />
          </Subtraction>
        </Geometry>
        <meshStandardMaterial
          color={color}
          roughness={1}
          side={THREE.DoubleSide}
        />
      </mesh>
    </RigidBody>
  );
}

// ----------------- Visual ring -----------------
function HoleVisualRing({ radius, color = "#8b5cf6" }) {
  const inner = 1.0;
  const outer = 1.18;
  const dark = 1.01;

  return (
    <group position={[0, 0.065, 0]} scale={[radius, radius, radius]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[inner, outer, 128]} />
        <meshStandardMaterial
          color="#e5e7eb"
          emissive={color}
          emissiveIntensity={0.9}
          metalness={0.2}
          roughness={0.25}
        />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <circleGeometry args={[dark, 128]} />
        <meshStandardMaterial color="#0b1020" roughness={1} />
      </mesh>
    </group>
  );
}

// ----------------- Progress ring -----------------
function ProgressRing({ radius, progress, color = "#22c55e" }) {
  const p = clamp01(progress);
  const theta = p * Math.PI * 2;

  const inner = 1.25;
  const outer = 1.4;

  return (
    <group
      position={[0, 0.14, 0]}
      scale={[radius, radius, radius]}
      renderOrder={999}
    >
      <mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={999}>
        <ringGeometry args={[inner, outer, 128]} />
        <meshBasicMaterial
          color="#0f172a"
          transparent
          opacity={0.8}
          depthTest={false}
        />
      </mesh>

      {theta > 0.001 && (
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.0005, 0]}
          renderOrder={1000}
        >
          <ringGeometry args={[inner, outer, 128, 1, 0, theta]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.95}
            depthTest={false}
          />
        </mesh>
      )}
    </group>
  );
}

// ----------------- Mouth sensor (NO SUCTION, only "armed") -----------------
function MouthSensor({ radius = 2.2, onMouthEnter }) {
  return (
    <RigidBody type="fixed" colliders={false}>
      <CuboidCollider
        // ✅ dar: yan taraftan tetiklenmesin
        args={[radius * 0.6, 0.35, radius * 0.6]}
        position={[0, 0.35, 0]}
        sensor
        onIntersectionEnter={(payload) => {
          const otherRB = payload?.other?.rigidBody;
          if (!otherRB) return;
          onMouthEnter?.(otherRB);
        }}
      />
    </RigidBody>
  );
}

// ----------------- Bottom sensor (tight) -----------------
function BottomSensor({ depth = 9, radius = 2.2, onHit }) {
  return (
    <RigidBody type="fixed" colliders={false}>
      <CuboidCollider
        // ✅ çok küçük: gerçekten merkeze düşmeyen yenmesin
        args={[radius * 0.28, 0.25, radius * 0.28]}
        position={[0, -depth + 0.2, 0]}
        sensor
        onIntersectionEnter={(payload) => {
          const otherRB = payload?.other?.rigidBody;
          if (!otherRB) return;
          onHit?.(otherRB);
        }}
      />
    </RigidBody>
  );
}

/**
 * ----------------- OBJ + forced colormap -----------------
 */
function OBJModel({
  objUrl,
  mtlUrl,
  resourcePath = "/models/obj/buildings/",
  colormapUrl = "/models/obj/buildings/textures/colormap.png",
  targetXZ = 5,
  extraScale = 1,
  yOffset = 0,
}) {
  const materials = useLoader(MTLLoader, mtlUrl, (loader) => {
    loader.setResourcePath(resourcePath);
  });

  const obj = useLoader(OBJLoader, objUrl, (loader) => {
    materials.preload();
    loader.setMaterials(materials);
  });

  const colormap = useLoader(TextureLoader, colormapUrl);

  const prepared = useMemo(() => {
    const cloned = obj.clone(true);
    const box = new THREE.Box3().setFromObject(cloned);
    const size = new THREE.Vector3();
    box.getSize(size);

    const maxXZ = Math.max(size.x || 1e-6, size.z || 1e-6);
    const scaleMul = (targetXZ / maxXZ) * extraScale;
    const yFix = -(box.min.y * scaleMul);

    return { cloned, scaleMul, yFix };
  }, [obj, targetXZ, extraScale]);

  useEffect(() => {
    if (!prepared?.cloned || !colormap) return;

    colormap.colorSpace = THREE.SRGBColorSpace;
    colormap.generateMipmaps = false;
    colormap.minFilter = THREE.NearestFilter;
    colormap.magFilter = THREE.NearestFilter;
    colormap.needsUpdate = true;

    prepared.cloned.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = true;
      o.receiveShadow = true;
      if (!o.geometry.attributes?.normal) o.geometry.computeVertexNormals();

      // ✅ Basic: texture garanti görünür
      o.material = new THREE.MeshBasicMaterial({
        map: colormap,
        color: "#ffffff",
      });
    });
  }, [prepared, colormap]);

  return (
    <primitive
      object={prepared.cloned}
      scale={prepared.scaleMul}
      position={[0, yOffset + prepared.yFix, 0]}
    />
  );
}

// ----------------- Dynamic prop -----------------
function DynamicProp({ p, registerRB }) {
  const [sx, sy, sz] = p.baseSize;

  return (
    <RigidBody
      ref={(rb) => registerRB?.(p.id, rb)}
      position={p.pos}
      colliders="cuboid"
      mass={p.mass}
      linearDamping={0.65}
      angularDamping={0.8}
      friction={1.0}
      restitution={0.0}
      userData={{ id: p.id, volume: p.volume }}
    >
      <group>
        <OBJModel
          objUrl={p.objUrl}
          mtlUrl={p.mtlUrl}
          resourcePath="/models/obj/buildings/"
          colormapUrl="/models/obj/buildings/textures/colormap.png"
          targetXZ={p.targetXZ ?? sx}
          extraScale={p.modelScale ?? 1}
          yOffset={p.modelYOffset ?? 0}
        />
      </group>
    </RigidBody>
  );
}

// ----------------- Scene -----------------
function Scene({ onScore }) {
  const keys = useKeyboard();

  // Hole size
  const [totalVolume, setTotalVolume] = useState(12);
  const GROWTH_K = 0.48;
  const holeR = GROWTH_K * Math.cbrt(totalVolume);

  // keep latest radius (for checks)
  const holeRRef = useRef(holeR);
  useEffect(() => {
    holeRRef.current = holeR;
  }, [holeR]);

  // Score
  const [totalScore, setTotalScore] = useState(0);
  const SCORE_K = 25;

  // Growth thresholds
  const BASE_NEED = 14;
  const NEED_FACTOR = 1.35;

  const [growLevel, setGrowLevel] = useState(0);
  const [needVol, setNeedVol] = useState(BASE_NEED);
  const [pendingVol, setPendingVol] = useState(0);

  const growLevelRef = useRef(0);
  const needVolRef = useRef(BASE_NEED);
  const pendingVolRef = useRef(0);

  // World wrap
  const ARENA = 500;
  const FLOOR_SIZE = 2200;

  const speed = 10.5;

  const bodies = useRef(new Map());
  const eaten = useRef(new Set());

  // ✅ only "armed" objects can be eaten (NO suction)
  const armed = useRef(new Set());

  // ----------------- CITY MAP -----------------
  const props = useMemo(() => {
    const low = [
      "low-detail-building-a",
      "low-detail-building-b",
      "low-detail-building-c",
      "low-detail-building-d",
      "low-detail-building-e",
      "low-detail-building-f",
      "low-detail-building-g",
      "low-detail-building-h",
      "low-detail-building-i",
      "low-detail-building-j",
      "low-detail-building-k",
      "low-detail-building-l",
      "low-detail-building-m",
      "low-detail-building-n",
      "low-detail-building-wide-a",
      "low-detail-building-wide-b",
    ];
    const normal = [
      "building-a",
      "building-b",
      "building-c",
      "building-d",
      "building-e",
      "building-f",
      "building-g",
      "building-h",
      "building-i",
      "building-j",
      "building-k",
      "building-l",
      "building-m",
      "building-n",
    ];
    const sky = [
      "building-skyscraper-a",
      "building-skyscraper-b",
      "building-skyscraper-c",
      "building-skyscraper-d",
      "building-skyscraper-e",
    ];
    const details = [
      "detail-awning",
      "detail-awning-wide",
      "detail-overhang",
      "detail-overhang-wide",
      "detail-parasol-a",
      "detail-parasol-b",
    ];

    const GRID = 10;
    const CELL = 9.5;
    const SAFE_MIN_R = 12;
    const start = -((GRID - 1) * CELL) / 2;

    const placed = [];
    const overlaps = (x, z, sx, sz, pad = 0.35) => {
      const aMinX = x - sx / 2 - pad;
      const aMaxX = x + sx / 2 + pad;
      const aMinZ = z - sz / 2 - pad;
      const aMaxZ = z + sz / 2 + pad;

      for (const b of placed) {
        if (
          aMinX <= b.maxX &&
          aMaxX >= b.minX &&
          aMinZ <= b.maxZ &&
          aMaxZ >= b.minZ
        )
          return true;
      }
      return false;
    };
    const registerAABB = (x, z, sx, sz, pad = 0.35) => {
      placed.push({
        minX: x - sx / 2 - pad,
        maxX: x + sx / 2 + pad,
        minZ: z - sz / 2 - pad,
        maxZ: z + sz / 2 + pad,
      });
    };

    const list = [];
    let idx = 0;

    const addOBJ = ({ x, z, sx, sy, sz, name, targetXZ, pad = 0.7 }) => {
      if (!inRadius(x, z, SAFE_MIN_R)) return false;
      if (overlaps(x, z, sx, sz, pad)) return false;

      const volume = boxVolume(sx, sy, sz);
      const mass = THREE.MathUtils.clamp(volume * 0.12, 0.25, 90);

      list.push({
        id: makeId("p", idx++),
        baseSize: [sx, sy, sz],
        volume,
        mass,
        pos: [x, sy / 2 + 0.05, z],
        objUrl: `/models/obj/buildings/${name}.obj`,
        mtlUrl: `/models/obj/buildings/${name}.mtl`,
        targetXZ,
      });

      registerAABB(x, z, sx, sz, pad);
      return true;
    };

    const SMALL = { sx: 2.2, sy: 4.2, sz: 2.2, targetXZ: 2.2, pad: 0.6 };
    const MID = { sx: 4.2, sy: 9.0, sz: 4.2, targetXZ: 4.2, pad: 1.0 };
    const BIG = { sx: 7.8, sy: 18.0, sz: 7.8, targetXZ: 7.8, pad: 1.5 };
    const SKY = { sx: 11.0, sy: 28.0, sz: 11.0, targetXZ: 11.0, pad: 2.0 };

    const nearCenter = (x, z) => x * x + z * z < 22 * 22;

    const sprinkleDetails = (cx, cz, count, area) => {
      for (let i = 0; i < count; i++) {
        const name = randChoice(details);
        const x = cx + randFloat(-area, area);
        const z = cz + randFloat(-area, area);
        addOBJ({
          x,
          z,
          sx: 1.0,
          sy: 1.0,
          sz: 1.0,
          name,
          targetXZ: 1.0,
          pad: 0.45,
        });
      }
    };

    const blocks = GRID - 1;
    for (let gx = 0; gx < blocks; gx++) {
      for (let gz = 0; gz < blocks; gz++) {
        const cx = start + (gx + 0.5) * CELL;
        const cz = start + (gz + 0.5) * CELL;
        const area = CELL * 0.38;

        const bCount = randInt(3, 6);
        for (let b = 0; b < bCount; b++) {
          const x = cx + randFloat(-area, area);
          const z = cz + randFloat(-area, area);

          let tier = MID;
          let namePool = normal;

          if (nearCenter(x, z)) {
            tier = Math.random() < 0.7 ? SMALL : MID;
            namePool = tier === SMALL ? low : normal;
          } else {
            const r = Math.random();
            if (r < 0.55) {
              tier = SMALL;
              namePool = low;
            } else if (r < 0.9) {
              tier = MID;
              namePool = normal;
            } else {
              tier = BIG;
              namePool = normal;
            }
          }

          const name = randChoice(namePool);
          addOBJ({
            x,
            z,
            sx: tier.sx,
            sy: tier.sy,
            sz: tier.sz,
            name,
            targetXZ: tier.targetXZ,
            pad: tier.pad,
          });
        }

        sprinkleDetails(cx, cz, randInt(6, 12), area + 0.4);
      }
    }

    // few skyscrapers far away
    const skyCount = 4;
    for (let i = 0; i < skyCount; i++) {
      const name = randChoice(sky);
      for (let t = 0; t < 80; t++) {
        const x = randFloat(start - 15, -start + 15);
        const z = randFloat(start - 15, -start + 15);
        if (x * x + z * z < 45 * 45) continue;
        if (
          addOBJ({
            x,
            z,
            sx: SKY.sx,
            sy: SKY.sy,
            sz: SKY.sz,
            name,
            targetXZ: SKY.targetXZ,
            pad: SKY.pad,
          })
        )
          break;
      }
    }

    return list;
  }, []);

  const registerRB = (id, rb) => {
    if (rb) bodies.current.set(id, rb);
  };

  // approx radius from volume (cube assumption)
  const approxRadiusFromVol = (vol) => {
    const s = Math.cbrt(Math.max(0.0001, vol));
    return s * 0.5;
  };

  // ✅ only "arm" when it can fit AND it really passed over the mouth
  const handleMouthEnter = (otherRB) => {
    const id = otherRB?.userData?.id;
    const vol = otherRB?.userData?.volume;
    if (!id || typeof vol !== "number") return;
    if (eaten.current.has(id)) return;

    // fit check
    const objR = approxRadiusFromVol(vol);
    const hR = holeRRef.current;
    if (objR > hR * 0.95) return;

    armed.current.add(id);
  };

  const handleBottomHit = (otherRB) => {
    const id = otherRB?.userData?.id;
    const vol = otherRB?.userData?.volume;

    if (!id || typeof vol !== "number") return;
    if (eaten.current.has(id)) return;

    // ✅ must have passed mouth first (prevents side/bottom weird hits)
    if (!armed.current.has(id)) return;

    // ✅ must be near exact center at the moment of bottom hit
    const t = otherRB.translation();
    const d = Math.hypot(t.x, t.z);
    if (d > holeRRef.current * 0.35) return;

    // ✅ fit check again (hole might have changed)
    const objR = approxRadiusFromVol(vol);
    if (objR > holeRRef.current * 0.95) return;

    eaten.current.add(id);
    armed.current.delete(id);

    otherRB.setEnabled(false);

    const gained = Math.max(1, Math.round(vol * SCORE_K));
    setTotalScore((s) => {
      const ns = s + gained;
      onScore?.(ns);
      return ns;
    });

    let np = pendingVolRef.current + vol;
    let curNeed = needVolRef.current;

    while (np >= curNeed) {
      setTotalVolume((v) => v + curNeed);
      np -= curNeed;

      growLevelRef.current += 1;
      curNeed = BASE_NEED * Math.pow(NEED_FACTOR, growLevelRef.current);
    }

    pendingVolRef.current = np;
    needVolRef.current = curNeed;

    setPendingVol(np);
    setNeedVol(curNeed);
    setGrowLevel(growLevelRef.current);
  };

  // movement (WORLD MOVES, hole stays) — NO suction
  useFrame((state, dt) => {
    const v = new THREE.Vector3(0, 0, 0);
    const k = keys.current;

    if (k.has("w") || k.has("arrowup")) v.z -= 1;
    if (k.has("s") || k.has("arrowdown")) v.z += 1;
    if (k.has("a") || k.has("arrowleft")) v.x -= 1;
    if (k.has("d") || k.has("arrowright")) v.x += 1;

    if (v.lengthSq() > 0) {
      v.normalize().multiplyScalar(speed * dt);

      bodies.current.forEach((rbApi, bid) => {
        if (!rbApi || eaten.current.has(bid)) return;

        const t = rbApi.translation();
        const nx = wrap(t.x - v.x, ARENA);
        const nz = wrap(t.z - v.z, ARENA);

        rbApi.setTranslation({ x: nx, y: t.y, z: nz }, true);
      });
    }

    const desired = new THREE.Vector3(14, 18, 22);
    state.camera.position.lerp(desired, 0.08);
    state.camera.lookAt(0, 0, 0);
  });

  const progress = needVol > 0 ? pendingVol / needVol : 0;

  return (
    <>
      <color attach="background" args={["#0b1224"]} />
      <fog attach="fog" args={["#0b1224", 80, 900]} />

      <ambientLight intensity={0.8} />
      <directionalLight position={[30, 40, 20]} intensity={1.2} castShadow />
      <hemisphereLight intensity={0.4} groundColor="#0b1224" />

      <GroundWithHole key={`g-${growLevel}`} radius={holeR} floorSize={FLOOR_SIZE} />
      <CupWell key={`c-${growLevel}`} radius={holeR} depth={9} wallThickness={0.35} />

      <HoleVisualRing radius={holeR} />
      <ProgressRing radius={holeR} progress={progress} color="#22c55e" />

      {/* ✅ sadece "arm" eder, çekme yok */}
      <MouthSensor radius={holeR} onMouthEnter={handleMouthEnter} />

      {/* ✅ gerçekten merkeze düşen yenir */}
      <BottomSensor key={`s-${growLevel}`} depth={9} radius={holeR} onHit={handleBottomHit} />

      {props.map((p) => (
        <DynamicProp key={p.id} p={p} registerRB={registerRB} />
      ))}
    </>
  );
}

export default function Game({ onScore }) {
  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [14, 18, 22], fov: 55, near: 0.1, far: 2500 }}
        gl={{
          outputColorSpace: THREE.SRGBColorSpace,
          toneMapping: THREE.NoToneMapping,
        }}
      >
        <Suspense fallback={null}>
          <Physics gravity={[0, -25, 0]} interpolate>
            <Scene onScore={onScore} />
          </Physics>
        </Suspense>
      </Canvas>
    </div>
  );
}
