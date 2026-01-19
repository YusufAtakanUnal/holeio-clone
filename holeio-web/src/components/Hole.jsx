import { RigidBody } from "@react-three/rapier";
import { Geometry, Base, Subtraction } from "@react-three/csg";
import * as THREE from "three";

/**
 * Physics Ground with Hole
 * Fizik motoru için delikli zemin
 */
export function PhysicsGround({ radius = 2, floorSize = 100, floorThickness = 0.5 }) {
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
        <meshStandardMaterial color="#1e293b" roughness={0.95} />
      </mesh>
    </RigidBody>
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
export function HoleVisual({ radius, ringColor = "#8b5cf6" }) {
  return (
    <group position={[0, 0.06, 0]}>
      {/* Dark center */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[radius * 1.02, 64]} />
        <meshStandardMaterial color="#020617" roughness={1} />
      </mesh>
      {/* Glowing ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[radius * 0.96, radius * 1.1, 64]} />
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
