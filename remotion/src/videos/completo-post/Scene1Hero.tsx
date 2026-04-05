import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";

export const Scene1Hero = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const iconScale = spring({ frame: frame - 5, fps, config: { damping: 12, stiffness: 120 } });
  const titleS = spring({ frame: frame - 15, fps, config: { damping: 18, stiffness: 160 } });
  const tagS = spring({ frame: frame - 30, fps, config: { damping: 20 } });
  const urlS = spring({ frame: frame - 45, fps, config: { damping: 22 } });
  const pulse = Math.sin(frame * 0.06) * 0.03 + 1;

  return (
    <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center", padding: "0 40px" }}>
        <div style={{ fontSize: 90, transform: `scale(${interpolate(iconScale, [0, 1], [0.2, 1]) * pulse})`, marginBottom: 20, filter: "drop-shadow(0 0 40px hsla(38, 90%, 50%, 0.4))" }}>🔧</div>
        <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: 58, fontWeight: 700, color: "white", opacity: interpolate(titleS, [0, 1], [0, 1]), transform: `translateY(${interpolate(titleS, [0, 1], [60, 0])}px)`, letterSpacing: -2, lineHeight: 1.1 }}>ConsultaParts AI</div>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 24, color: "hsla(0,0%,100%,0.7)", opacity: interpolate(tagS, [0, 1], [0, 1]), transform: `translateY(${interpolate(tagS, [0, 1], [30, 0])}px)`, marginTop: 14 }}>Sistema Completo para Auto Peças</div>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 22, color: "hsl(38, 92%, 50%)", fontWeight: 600, opacity: interpolate(urlS, [0, 1], [0, 1]), transform: `scale(${interpolate(urlS, [0, 1], [0.8, 1])})`, marginTop: 20, letterSpacing: 2 }}>www.partsai.online</div>
      </div>
    </AbsoluteFill>
  );
};
