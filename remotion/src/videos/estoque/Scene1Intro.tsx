import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";

export const Scene1Intro = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const titleS = spring({ frame: frame - 10, fps, config: { damping: 18, stiffness: 160 } });
  const tagS = spring({ frame: frame - 25, fps, config: { damping: 20 } });
  const iconScale = spring({ frame: frame - 5, fps, config: { damping: 12, stiffness: 120 } });
  const pulse = Math.sin(frame * 0.08) * 0.03 + 1;

  return (
    <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{
          fontSize: 120,
          transform: `scale(${interpolate(iconScale, [0, 1], [0.3, 1]) * pulse})`,
          marginBottom: 30,
          filter: `drop-shadow(0 0 40px hsla(38, 90%, 50%, 0.3))`,
        }}>📦</div>
        <div style={{
          fontFamily: "Space Grotesk, sans-serif", fontSize: 72, fontWeight: 700, color: "white",
          opacity: interpolate(titleS, [0, 1], [0, 1]),
          transform: `translateY(${interpolate(titleS, [0, 1], [60, 0])}px)`,
          letterSpacing: -2,
        }}>Gestão de Estoque</div>
        <div style={{
          fontFamily: "Inter, sans-serif", fontSize: 28, color: "hsl(38, 92%, 50%)", fontWeight: 600,
          opacity: interpolate(tagS, [0, 1], [0, 1]),
          transform: `translateY(${interpolate(tagS, [0, 1], [30, 0])}px)`,
          marginTop: 16, letterSpacing: 3, textTransform: "uppercase",
        }}>NovoPeçaí — Controle Total</div>
      </div>
    </AbsoluteFill>
  );
};
