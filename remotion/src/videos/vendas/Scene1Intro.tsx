import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";

export const Scene1Intro = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleS = spring({ frame: frame - 10, fps, config: { damping: 18, stiffness: 160 } });
  const titleY = interpolate(titleS, [0, 1], [60, 0]);
  const titleOp = interpolate(titleS, [0, 1], [0, 1]);

  const tagS = spring({ frame: frame - 25, fps, config: { damping: 20 } });
  const tagOp = interpolate(tagS, [0, 1], [0, 1]);
  const tagY = interpolate(tagS, [0, 1], [30, 0]);

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
        }}>
          🛒
        </div>
        <div style={{
          fontFamily: "Space Grotesk, sans-serif",
          fontSize: 72,
          fontWeight: 700,
          color: "white",
          opacity: titleOp,
          transform: `translateY(${titleY}px)`,
          letterSpacing: -2,
        }}>
          Central de Vendas
        </div>
        <div style={{
          fontFamily: "Inter, sans-serif",
          fontSize: 28,
          color: "hsl(38, 92%, 50%)",
          fontWeight: 600,
          opacity: tagOp,
          transform: `translateY(${tagY}px)`,
          marginTop: 16,
          letterSpacing: 3,
          textTransform: "uppercase",
        }}>
          NovoPeçaí — Fluxo Completo
        </div>
      </div>
    </AbsoluteFill>
  );
};
