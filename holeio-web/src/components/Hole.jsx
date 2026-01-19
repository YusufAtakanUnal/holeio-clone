import { RigidBody } from "@react-three/rapier";
import { Geometry, Base, Subtraction } from "@react-three/csg";
import * as THREE from "three";

/**
 * Physics Ground with Hole
 * Fizik motoru için delikli zemin
 */
export function PhysicsGround({ radius = 2, floorSize = 500, floorThickness = 5 }) {
  const t = floorThickness;
  const s = floorSize;
  const h = radius; // hole radius

  // Create 4 boxes around the hole to form the floor WITHOUT CSG
  // This is much more stable for physics and performance

  // North Box (Positive Z)
  const nPos = [0, -t / 2, (s + h) / 2];
  const nSize = [s, t, s - h];

  // South Box (Negative Z)
  const sPos = [0, -t / 2, -(s + h) / 2];
  const sSize = [s, t, s - h];

  // East Box (Positive X)
  const ePos = [(s + h) / 2, -t / 2, 0];
  const eSize = [s - h, t, h * 2]; // Fits between N/S

  // West Box (Negative X)
  const wPos = [-(s + h) / 2, -t / 2, 0];
  const wSize = [s - h, t, h * 2]; // Fits between N/S

  return (
    <group>
      {/* North */}
      <RigidBody type="fixed" colliders="cuboid" friction={1} restitution={0}>
        <mesh position={nPos} receiveShadow>
          <boxGeometry args={nSize} />
          <meshStandardMaterial color="#1e293b" roughness={0.95} />
        </mesh>
      </RigidBody>

      {/* South */}
      <RigidBody type="fixed" colliders="cuboid" friction={1} restitution={0}>
        <mesh position={sPos} receiveShadow>
          <boxGeometry args={sSize} />
          <meshStandardMaterial color="#1e293b" roughness={0.95} />
        </mesh>
      </RigidBody>

      {/* East */}
      <RigidBody type="fixed" colliders="cuboid" friction={1} restitution={0}>
        <mesh position={ePos} receiveShadow>
          <boxGeometry args={eSize} />
          <meshStandardMaterial color="#1e293b" roughness={0.95} />
        </mesh>
      </RigidBody>

      {/* West */}
      <RigidBody type="fixed" colliders="cuboid" friction={1} restitution={0}>
        <mesh position={wPos} receiveShadow>
          <boxGeometry args={wSize} />
          <meshStandardMaterial color="#1e293b" roughness={0.95} />
        </mesh>
      </RigidBody>
    </group>
  );
}

/**
 * Hole Well
 * Deliğin duvarları
 */
export function HoleWell({ radius = 2, depth = 8, color = "#0f172a" }) {
  const wallThickness = 0.3;
  const outer = radius + wallThickness;
  const inner = radius;

  return (
    <RigidBody type="fixed" colliders="trimesh" friction={0.8} restitution={0}>
      <mesh position={[0, -depth / 2, 0]}>
        <Geometry>
          <Base>
            <cylinderGeometry args={[outer, outer, depth, 64, 1, true]} />
          </Base>
          <Subtraction>
            <cylinderGeometry args={[inner, inner, depth + 0.2, 64, 1, true]} />
          </Subtraction>
        </Geometry>
        <meshStandardMaterial color={color} roughness={1} side={THREE.DoubleSide} />
      </mesh>
    </RigidBody>
  );
}

/**
 * Hole Visual Ring
 * Deliğin görsel halkası
 */
export function HoleVisual({ radius, progress = 0, ringColor = "#8b5cf6" }) {
  return (
    <group position={[0, 0.06, 0]}>
      {/* Dark center */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[radius * 1.02, 64]} />
        <meshStandardMaterial color="#020617" roughness={1} />
      </mesh>
      {/* Base ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[radius * 0.96, radius * 1.1, 64]} />
        <meshStandardMaterial
          color={ringColor}
          emissive={ringColor}
          emissiveIntensity={0.2}
          roughness={0.3}
          transparent
          opacity={0.3}
        />
      </mesh>
      {/* Progress ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry
          args={[radius * 0.96, radius * 1.1, 64, 1, 0, progress * Math.PI * 2]}
        />
        <meshStandardMaterial
          color={ringColor}
          emissive={ringColor}
          emissiveIntensity={0.8}
          roughness={0.3}
        />
      </mesh>
    </group>
  );
}

export default { PhysicsGround, HoleWell, HoleVisual };
