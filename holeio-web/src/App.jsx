import { useState } from "react";
import Game from "./Game";

export default function App() {
  const [score, setScore] = useState(0);

  return (
    <>
      <Game onScore={(v) => setScore((s) => s + v)} />
      <div
        style={{
          position: "fixed",
          left: 16,
          top: 16,
          color: "white",
          background: "rgba(0,0,0,0.35)",
          padding: "10px 12px",
          borderRadius: 12,
          font: "600 14px system-ui",
          backdropFilter: "blur(6px)",
        }}
      >
        Score: {score} <span style={{ opacity: 0.7 }}>| WASD</span>
      </div>
    </>
  );
}
