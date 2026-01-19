import { useState } from "react";
import Game from "./Game";
import { LEVEL_1, getAllLevels } from "./levels";

// Level ikonları
const LEVEL_ICONS = ["🏘️", "🌃", "🌲"];

export default function App() {
  const [currentLevel, setCurrentLevel] = useState(LEVEL_1);
  const [score, setScore] = useState(0);
  const [showMenu, setShowMenu] = useState(true);

  const levels = getAllLevels();

  const handleScoreUpdate = (points) => {
    setScore((prev) => prev + points);
  };

  const handleLevelSelect = (level) => {
    setCurrentLevel(level);
    setScore(0);
    setShowMenu(false);
  };

  const handleBackToMenu = () => {
    setShowMenu(true);
    setScore(0);
  };

  // Level Selection Menu
  if (showMenu) {
    return (
      <div
        style={{
          width: "100vw",
          height: "100vh",
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <h1
          style={{
            fontSize: "4rem",
            color: "#f8fafc",
            marginBottom: "0.5rem",
            textShadow: "0 4px 20px rgba(139, 92, 246, 0.5)",
          }}
        >
          🕳️ Hole.io Clone
        </h1>
        <p style={{ color: "#94a3b8", fontSize: "1.2rem", marginBottom: "3rem" }}>
          Level seç ve yutmaya başla!
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "1.5rem",
            maxWidth: "900px",
          }}
        >
          {levels.map((level, idx) => (
            <button
              key={level.id}
              onClick={() => handleLevelSelect(level)}
              style={{
                padding: "2rem",
                borderRadius: "1rem",
                border: "2px solid #334155",
                background: "linear-gradient(145deg, #1e293b 0%, #0f172a 100%)",
                color: "#f8fafc",
                cursor: "pointer",
                transition: "all 0.2s ease",
                textAlign: "left",
              }}
              onMouseEnter={(e) => {
                e.target.style.borderColor = "#8b5cf6";
                e.target.style.transform = "translateY(-4px)";
                e.target.style.boxShadow = "0 10px 30px rgba(139, 92, 246, 0.3)";
              }}
              onMouseLeave={(e) => {
                e.target.style.borderColor = "#334155";
                e.target.style.transform = "translateY(0)";
                e.target.style.boxShadow = "none";
              }}
            >
              <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>
                {LEVEL_ICONS[idx] || "🎮"}
              </div>
              <div style={{ fontSize: "1.4rem", fontWeight: "bold", marginBottom: "0.25rem" }}>
                Level {idx + 1}
              </div>
              <div style={{ fontSize: "1.1rem", fontWeight: "600", color: "#a78bfa" }}>
                {level.name}
              </div>
              <div style={{ fontSize: "0.9rem", color: "#64748b", marginTop: "0.5rem" }}>
                {level.description}
              </div>
            </button>
          ))}
        </div>

        <div style={{ marginTop: "3rem", color: "#64748b", fontSize: "0.9rem" }}>
          WASD veya Ok tuşları ile hareket et
        </div>
      </div>
    );
  }

  // Game Screen
  return (
    <>
      <Game level={currentLevel} onScoreUpdate={handleScoreUpdate} />

      {/* HUD */}
      <div
        style={{
          position: "fixed",
          left: 16,
          top: 16,
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem",
        }}
      >
        {/* Level Info */}
        <div
          style={{
            color: "white",
            background: "rgba(0,0,0,0.6)",
            padding: "8px 14px",
            borderRadius: 10,
            font: "600 13px system-ui",
            backdropFilter: "blur(8px)",
          }}
        >
          📍 {currentLevel.name}
        </div>

        {/* Score */}
        <div
          style={{
            color: "white",
            background: "rgba(0,0,0,0.6)",
            padding: "10px 16px",
            borderRadius: 12,
            font: "700 18px system-ui",
            backdropFilter: "blur(8px)",
          }}
        >
          🏆 {score}
        </div>
      </div>

      {/* Controls Info */}
      <div
        style={{
          position: "fixed",
          right: 16,
          top: 16,
          color: "white",
          background: "rgba(0,0,0,0.5)",
          padding: "8px 14px",
          borderRadius: 10,
          font: "500 12px system-ui",
          backdropFilter: "blur(8px)",
        }}
      >
        WASD ile hareket et
      </div>

      {/* Back Button */}
      <button
        onClick={handleBackToMenu}
        style={{
          position: "fixed",
          left: 16,
          bottom: 16,
          padding: "10px 20px",
          borderRadius: 10,
          border: "none",
          background: "rgba(139, 92, 246, 0.8)",
          color: "white",
          font: "600 14px system-ui",
          cursor: "pointer",
          backdropFilter: "blur(8px)",
        }}
      >
        ← Menüye Dön
      </button>
    </>
  );
}
