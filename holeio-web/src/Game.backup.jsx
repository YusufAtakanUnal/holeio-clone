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
 * ----------------- Generic OBJ Model (buildings + objects)
 * dir: "buildings" | "objects"
 * name: file name without extension (e.g. "building-a", "fence-1x2")
 */
function OBJModel({
  dir = "buildings",
  name,
  targetXZ = 5,
  extraScale = 1,
  yOffset = 0,
  forceColormap = false, // buildings için
  colormapUrl = "/models/obj/buildings/textures/colormap.png",
}) {
  const basePath = `/models/obj/${dir}/`;
  const objUrl = `${basePath}${name}.obj`;
  const mtlUrl = `${basePath}${name}.mtl`;

  // ✅ objects için fallback texture (sende bu var)
  const objectsColormap = useLoader(
    TextureLoader,
    "/models/obj/objects/textures/colormap.png"
  );

  // buildings colormap (zaten vardı)
  const buildingsColormap = useLoader(TextureLoader, colormapUrl);

  const materials = useLoader(MTLLoader, mtlUrl, (loader) => {
    // ✅ mtl içindeki map_Kd "textures/..." ise buradan çözer
    loader.setResourcePath(basePath);
  });

  const obj = useLoader(OBJLoader, objUrl, (loader) => {
    materials.preload();
    loader.setMaterials(materials);
  });

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
    if (!prepared?.cloned) return;

    // texture ayarları
    const setupTex = (tex) => {
      if (!tex) return;
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.generateMipmaps = false;
      tex.minFilter = THREE.NearestFilter;
      tex.magFilter = THREE.NearestFilter;
      tex.needsUpdate = true;
    };

    setupTex(buildingsColormap);
    setupTex(objectsColormap);

    prepared.cloned.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = true;
      o.receiveShadow = true;
      if (!o.geometry.attributes?.normal) o.geometry.computeVertexNormals();

      // helper: material array olabilir
      const mats = Array.isArray(o.material) ? o.material : [o.material];

      // ✅ buildings: eski stil (colormap zorla)
      if (forceColormap && buildingsColormap) {
        o.material = new THREE.MeshBasicMaterial({
          map: buildingsColormap,
          color: "#ffffff",
        });
        return;
      }

      // ✅ objects: MTL map bulamazsa fallback colormap bas
      if (dir === "objects" && objectsColormap) {
        let anyHadMap = false;

        for (const m of mats) {
          if (m?.map) anyHadMap = true;
        }

        // map yoksa -> fallback
        if (!anyHadMap) {
          o.material = new THREE.MeshStandardMaterial({
            map: objectsColormap,
            color: "#ffffff",
            roughness: 1,
            metalness: 0,
          });
        } else {
          // map varsa ama koyu görünüyorsa rengi beyazla
          for (const m of mats) {
            if (m?.color) m.color.set("#ffffff");
            if (m && "needsUpdate" in m) m.needsUpdate = true;
          }
        }
      }
    });
  }, [prepared, dir, forceColormap, buildingsColormap, objectsColormap]);

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
      <group rotation={[0, p.ry ?? 0, 0]}>
        <OBJModel
          dir={p.dir} // "buildings" | "objects"
          name={p.name}
          targetXZ={p.targetXZ ?? sx}
          extraScale={p.modelScale ?? 1}
          yOffset={p.modelYOffset ?? 0}
          forceColormap={p.forceColormap ?? false}
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

  // ----------------- CITY MAP (FIXED GRID) -----------------
  const props = useMemo(() => {
    const list = [];
    let idx = 0;

    // ---- deterministic hash helpers ----
    const hash2 = (gx, gz) => {
      const n = Math.sin(gx * 127.1 + gz * 311.7) * 43758.5453123;
      return n - Math.floor(n);
    };
    const pick = (arr, gx, gz, salt = 0) => {
      const h = hash2(gx + salt * 17, gz - salt * 29);
      return arr[Math.floor(h * arr.length) % arr.length];
    };

    // ---- layout params ----
    const GRID = 18; // parsel grid
    const CELL = 10;
    const ROAD_EVERY = 5; // her 5 hücrede bir yol çizgisi
    const ROAD_GAP = 2.4; // parsel içinde kaldırım boşluğu
    const start = -((GRID - 1) * CELL) / 2;

    const SAFE_MIN_R = 14; // deliğin çevresi boş
    const isSafe = (x, z) => inRadius(x, z, SAFE_MIN_R);

    // ---- buildings pools ----
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

    // ---- objects pools (senin attıkların) ----
    const fences = [
      "fence-1x2",
      "fence-1x3",
      "fence-1x4",
      "fence-2x2",
      "fence-2x3",
      "fence-3x2",
      "fence-3x3",
      "fence-low",
      "fence",
    ];
    const trees = ["tree-small", "tree-large"];
    const paths = [
      "path-short",
      "path-long",
      "path-stones-short",
      "path-stones-long",
      "path-stones-messy",
    ];
    const misc = ["planter"];

    const addOBJ = ({
      dir,
      name,
      x,
      z,
      sx,
      sy,
      sz,
      targetXZ,
      yOffset = 0,
      modelScale = 1,
      ry = 0,
      forceColormap = false,
    }) => {
      if (!isSafe(x, z)) return;

      const volume = boxVolume(sx, sy, sz);
      const mass = THREE.MathUtils.clamp(volume * 0.12, 0.25, 90);

      list.push({
        id: makeId("p", idx++),
        dir,
        name,
        baseSize: [sx, sy, sz],
        volume,
        mass,
        pos: [x, sy / 2 + 0.05, z],
        targetXZ,
        modelScale,
        modelYOffset: yOffset,
        ry,
        forceColormap,
      });
    };

    // building tiers
    const SMALL = { sx: 3.0, sy: 4.6, sz: 3.0 };
    const MID = { sx: 5.2, sy: 9.6, sz: 5.2 };
    const BIG = { sx: 7.6, sy: 16.0, sz: 7.6 };
    const SKYT = { sx: 10.5, sy: 28.0, sz: 10.5 };

    const zoneOf = (gx, gz) => {
      const cx = gx - (GRID - 1) / 2;
      const cz = gz - (GRID - 1) / 2;
      const r = Math.hypot(cx, cz);
      if (r < GRID * 0.22) return 0; // merkez
      if (r < GRID * 0.38) return 1; // orta
      return 2; // dış
    };

    for (let gx = 0; gx < GRID; gx++) {
      for (let gz = 0; gz < GRID; gz++) {
        const isRoadCol = gx % ROAD_EVERY === ROAD_EVERY - 1;
        const isRoadRow = gz % ROAD_EVERY === ROAD_EVERY - 1;
        if (isRoadCol || isRoadRow) continue;

        const px = start + gx * CELL;
        const pz = start + gz * CELL;

        // parsel içi küçük deterministik offset
        const ox = (hash2(gx, gz) - 0.5) * (CELL * 0.18);
        const oz = (hash2(gx + 99, gz + 77) - 0.5) * (CELL * 0.18);

        const x = px + ox;
        const z = pz + oz;

        const zone = zoneOf(gx, gz);
        const h = hash2(gx, gz);

        const maxFootprint = CELL - ROAD_GAP * 2;

        let tier = MID;
        let pool = normal;

        if (zone === 0) {
          if (h > 0.92) {
            tier = SKYT;
            pool = sky;
          } else if (h > 0.55) {
            tier = BIG;
            pool = normal;
          } else {
            tier = MID;
            pool = normal;
          }
        } else if (zone === 1) {
          if (h > 0.85) {
            tier = BIG;
            pool = normal;
          } else if (h > 0.35) {
            tier = MID;
            pool = normal;
          } else {
            tier = SMALL;
            pool = low;
          }
        } else {
          if (h > 0.9) {
            tier = MID;
            pool = normal;
          } else {
            tier = SMALL;
            pool = low;
          }
        }

        const sx = Math.min(tier.sx, maxFootprint);
        const sz = Math.min(tier.sz, maxFootprint);
        const sy = tier.sy;

        const bname = pick(pool, gx, gz, zone + 1);

        // ---- BUILDING ----
        addOBJ({
          dir: "buildings",
          name: bname,
          x,
          z,
          sx,
          sy,
          sz,
          targetXZ: Math.max(sx, sz),
          forceColormap: true, // senin buildings colormap stili
          ry: (hash2(gx + 5, gz + 5) - 0.5) * 0.35,
        });

        // ---- OBJECTS (fence/tree/path/planter) ----
        const sidewalk = CELL * 0.5 - 1.6;

        // 1) ağaç: her 3 hücrede bir
        if ((gx + gz) % 3 === 0) {
          const tname = pick(trees, gx, gz, 11);
          addOBJ({
            dir: "objects",
            name: tname,
            x: x + sidewalk,
            z: z + sidewalk,
            sx: 2.2,
            sy: 4.5,
            sz: 2.2,
            targetXZ: 2.4,
            ry: (hash2(gx + 101, gz + 33) - 0.5) * 0.5,
            forceColormap: false,
          });
        }

        // 2) path: checker gibi
        if (gx % 2 === 0 && gz % 2 === 1) {
          const pname = pick(paths, gx, gz, 31);
          addOBJ({
            dir: "objects",
            name: pname,
            x: x + 0.2,
            z: z - 0.2,
            sx: 3.0,
            sy: 0.4,
            sz: 1.8,
            targetXZ: 3.2,
            ry: pick([0, Math.PI / 2], gx, gz, 32),
          });
        }

        // 3) planter: her 5 hücrede bir
        if ((gx + gz) % 5 === 0) {
          const mname = pick(misc, gx, gz, 41);
          addOBJ({
            dir: "objects",
            name: mname,
            x: x - sidewalk,
            z: z + sidewalk,
            sx: 1.2,
            sy: 1.0,
            sz: 1.2,
            targetXZ: 1.2,
            ry: (hash2(gx + 7, gz + 77) - 0.5) * 0.6,
          });
        }

        // 4) fence: yol çizgisine yakın parsellerde
        const nearRoadX = gx % ROAD_EVERY === ROAD_EVERY - 2;
        const nearRoadZ = gz % ROAD_EVERY === ROAD_EVERY - 2;

        if (nearRoadX) {
          const fname = pick(fences, gx, gz, 21);
          addOBJ({
            dir: "objects",
            name: fname,
            x: x + CELL * 0.45,
            z,
            sx: 3.0,
            sy: 1.2,
            sz: 0.6,
            targetXZ: 3.2,
            ry: Math.PI / 2, // yol kenarına paralel
          });
        }
        if (nearRoadZ) {
          const fname = pick(fences, gx, gz, 22);
          addOBJ({
            dir: "objects",
            name: fname,
            x,
            z: z + CELL * 0.45,
            sx: 3.0,
            sy: 1.2,
            sz: 0.6,
            targetXZ: 3.2,
            ry: 0,
          });
        }
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

    // must have passed mouth first
    if (!armed.current.has(id)) return;

    // must be near exact center at bottom hit
    const t = otherRB.translation();
    const d = Math.hypot(t.x, t.z);
    if (d > holeRRef.current * 0.35) return;

    // fit check again
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

      <GroundWithHole
        key={`g-${growLevel}`}
        radius={holeR}
        floorSize={FLOOR_SIZE}
      />
      <CupWell
        key={`c-${growLevel}`}
        radius={holeR}
        depth={9}
        wallThickness={0.35}
      />

      <HoleVisualRing radius={holeR} />
      <ProgressRing radius={holeR} progress={progress} color="#22c55e" />

      <MouthSensor radius={holeR} onMouthEnter={handleMouthEnter} />
      <BottomSensor
        key={`s-${growLevel}`}
        depth={9}
        radius={holeR}
        onHit={handleBottomHit}
      />

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
