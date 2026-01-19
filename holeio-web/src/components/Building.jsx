import { useRef, useMemo, useEffect } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import { RigidBody } from "@react-three/rapier";
import { TextureLoader } from "three";
import * as THREE from "three";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader";
import { MTLLoader } from "three/examples/jsm/loaders/MTLLoader";

/**
 * OBJ Model Loader
 * dir: "buildings" | "objects"
 */
function OBJModel({ name, dir = "buildings", targetXZ = 5, extraScale = 1 }) {
  const basePath = `/models/obj/${dir}/`;
  const objUrl = `${basePath}${name}.obj`;
  const mtlUrl = `${basePath}${name}.mtl`;
  const colormapUrl = `${basePath}textures/colormap.png`;

  const colormap = useLoader(TextureLoader, colormapUrl);
  const materials = useLoader(MTLLoader, mtlUrl, (loader) => {
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
    if (!prepared?.cloned || !colormap) return;

    colormap.colorSpace = THREE.SRGBColorSpace;
    colormap.generateMipmaps = false;
    colormap.minFilter = THREE.NearestFilter;
    colormap.magFilter = THREE.NearestFilter;

    prepared.cloned.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = true;
      o.receiveShadow = true;

      // Colormap uygula
      o.material = new THREE.MeshStandardMaterial({
        map: colormap,
        color: "#ffffff",
        roughness: 0.9,
        metalness: 0,
      });
    });
  }, [prepared, colormap]);

  return (
    <primitive
      object={prepared.cloned}
      scale={prepared.scaleMul}
      position={[0, prepared.yFix, 0]}
    />
  );
}

/**
 * Building/Object Component
 * Fizik motorlu obje (bina veya doğa objesi)
 */
export function Building({ id, position, name, size, dir = "buildings", rotation = 0, onRegister, onEaten }) {
  const ref = useRef();
  const registered = useRef(false);
  const fallen = useRef(false);

  useFrame(() => {
    if (!ref.current || fallen.current) return;

    if (!registered.current) {
      registered.current = true;
      onRegister?.(id, ref.current);
    }

    const pos = ref.current.translation();
    // Threshold deepened to -35 to allow tall buildings to fall completely
    if (pos.y < -35) {
      fallen.current = true;
      ref.current.setEnabled(false);
      onEaten?.(id);
    }
  });

  const [sx, sy, sz] = size;
  const volume = sx * sy * sz;
  const mass = Math.min(volume * 0.15, 100);

  return (
    <RigidBody
      ref={ref}
      position={position}
      colliders="cuboid"
      mass={mass}
      linearDamping={0.1} // Reduced air resistance
      angularDamping={0.1} // Reduced angular resistance
      friction={0.2} // Slippery
      restitution={0}
      userData={{ id, volume }}
    >
      <group rotation={[0, rotation, 0]}>
        <OBJModel name={name} dir={dir} targetXZ={Math.max(sx, sz)} />
      </group>
    </RigidBody>
  );
}

export default Building;
