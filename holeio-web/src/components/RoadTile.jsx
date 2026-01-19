import { useMemo } from "react";
import * as THREE from "three";

/**
 * Road Tile Component
 * Tek bir yol tile'ı - şehir bloğu + yollar
 */
export function RoadTile({ position, size = 25, colors }) {
  const roadTexture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");

    const roadWidth = 80;
    const sidewalkWidth = 20;

    // Block area (where buildings sit)
    ctx.fillStyle = colors.block;
    ctx.fillRect(0, 0, 512, 512);

    // Roads - asphalt
    ctx.fillStyle = colors.road;
    ctx.fillRect(0, 512 - roadWidth, 512, roadWidth);
    ctx.fillRect(512 - roadWidth, 0, roadWidth, 512);

    // Sidewalks
    ctx.fillStyle = colors.sidewalk;
    ctx.fillRect(0, 512 - roadWidth - sidewalkWidth, 512 - roadWidth, sidewalkWidth);
    ctx.fillRect(512 - roadWidth - sidewalkWidth, 0, sidewalkWidth, 512 - roadWidth);

    // Yellow center dashed line
    ctx.strokeStyle = colors.centerLine;
    ctx.lineWidth = 4;
    ctx.setLineDash([25, 15]);
    ctx.beginPath();
    ctx.moveTo(0, 512 - roadWidth / 2);
    ctx.lineTo(512 - roadWidth, 512 - roadWidth / 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(512 - roadWidth / 2, 0);
    ctx.lineTo(512 - roadWidth / 2, 512 - roadWidth);
    ctx.stroke();

    // White edge lines
    ctx.strokeStyle = colors.edgeLine;
    ctx.lineWidth = 3;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(0, 512 - roadWidth + 12);
    ctx.lineTo(512 - roadWidth - sidewalkWidth, 512 - roadWidth + 12);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, 512 - 12);
    ctx.lineTo(512 - roadWidth - sidewalkWidth, 512 - 12);
    ctx.stroke();

    // Intersection area
    ctx.fillStyle = colors.intersection;
    ctx.fillRect(512 - roadWidth, 512 - roadWidth, roadWidth, roadWidth);

    // Zebra crossing
    ctx.fillStyle = colors.zebra;
    for (let i = 0; i < 5; i++) {
      ctx.fillRect(512 - roadWidth - sidewalkWidth - 80 + i * 18, 512 - roadWidth + 15, 10, roadWidth - 30);
    }
    for (let i = 0; i < 5; i++) {
      ctx.fillRect(512 - roadWidth + 15, 512 - roadWidth - sidewalkWidth - 80 + i * 18, roadWidth - 30, 10);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }, [colors]);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[position[0], 0.01, position[1]]}>
      <planeGeometry args={[size, size]} />
      <meshStandardMaterial map={roadTexture} roughness={0.9} />
    </mesh>
  );
}

export default RoadTile;
