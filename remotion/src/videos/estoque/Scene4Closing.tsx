import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";

export const Scene4Closing = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s1 = spring({ frame: frame - 10, fps, config: { damping: 15, stiffness: 120 } });
  const s2 = spring({ frame: frame - 30, fps, config: { damping: 20 } });
  const s3 = spring({ frame: frame - 45, fps, config: { damping: 25 } });
  const pulse = Math.sin(frame * 0.06) * 0.02 + 1;

  return (
    <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{
          fontFamily: "Space Grotesk, sans-serif", fontSize: 56, fontWeight: 700, color: "white",
          opacity: interpolate(s1, [0, 1], [0, 1]),
          transform: `translateY(${interpolate(s1, [0, 1], [40, 0])}px) scale(${pulse})`,
          letterSpacing: -1, marginBottom: 16,
        }}>Nunca mais falte peça.</div>
        <div style={{
          fontFamily: "Inter, sans-serif", fontSize: 24, color: "hsla(0,0%,100%,0.6)",
          opacity: interpolate(s2, [0, 1], [0, 1]),
          transform: `translateY(${interpolate(s2, [0, 1], [20, 0])}px)`,
          marginBottom: 40,
        }}>Estoque inteligente no NovoPeçaí</div>
        <div style={{
          fontFamily: "Space Grotesk, sans-serif", fontSize: 32, color: "hsl(38, 92%, 50%)", fontWeight: 700,
          opacity: interpolate(s3, [0, 1], [0, 1]),
          transform: `scale(${interpolate(s3, [0, 1], [0.8, 1])})`,
          letterSpacing: 2,
        }}>novopecai.com</div>
      </div>
    </AbsoluteFill>
  );
};
