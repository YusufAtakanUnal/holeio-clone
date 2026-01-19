import { useMemo } from "react";
import * as THREE from "three";

/**
 * Grass Tile Component
 * Çimen/ova zemini - yol olmadan
 */
export function GrassTile({ position, size = 25, colors }) {
  const grassTexture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");

    // Ana çimen rengi
    ctx.fillStyle = colors.primary;
    ctx.fillRect(0, 0, 256, 256);

    // Rastgele çimen desenleri
    const random = (seed) => {
      const x = Math.sin(seed) * 10000;
      return x - Math.floor(x);
    };

    // Koyu çimen lekeleri
    ctx.fillStyle = colors.secondary;
    for (let i = 0; i < 30; i++) {
      const x = random(i * 17) * 256;
      const y = random(i * 31) * 256;
      const r = 8 + random(i * 7) * 20;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Açık çimen lekeleri
    ctx.fillStyle = colors.accent;
    for (let i = 0; i < 20; i++) {
      const x = random(i * 23 + 100) * 256;
      const y = random(i * 41 + 100) * 256;
      const r = 5 + random(i * 13) * 15;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Küçük toprak lekeleri
    ctx.fillStyle = colors.dirt;
    for (let i = 0; i < 8; i++) {
      const x = random(i * 37 + 200) * 256;
      const y = random(i * 53 + 200) * 256;
      const r = 3 + random(i * 19) * 8;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Çimen çizgileri (texture detayı)
    ctx.strokeStyle = colors.secondary;
    ctx.lineWidth = 1;
    for (let i = 0; i < 50; i++) {
      const x = random(i * 11 + 300) * 256;
      const y = random(i * 29 + 300) * 256;
      const len = 5 + random(i * 17) * 10;
      const angle = random(i * 43) * Math.PI;
      
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 2);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }, [colors]);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[position[0], 0.01, position[1]]}>
      <planeGeometry args={[size, size]} />
      <meshStandardMaterial map={grassTexture} roughness={0.95} />
    </mesh>
  );
}

export default GrassTile;
