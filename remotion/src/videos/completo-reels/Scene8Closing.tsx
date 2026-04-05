import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";

export const Scene8Closing = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s1 = spring({ frame: frame - 10, fps, config: { damping: 15, stiffness: 120 } });
  const s2 = spring({ frame: frame - 25, fps, config: { damping: 20 } });
  const s4 = spring({ frame: frame - 55, fps, config: { damping: 25 } });
  const pulse = Math.sin(frame * 0.06) * 0.02 + 1;

  const stats = [
    { value: "40+", label: "Funcionalidades" },
    { value: "6", label: "Módulos" },
    { value: "∞", label: "Possibilidades" },
  ];

  return (
    <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center", padding: "0 50px" }}>
        <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: 56, fontWeight: 700, color: "white", opacity: interpolate(s1, [0, 1], [0, 1]), transform: `translateY(${interpolate(s1, [0, 1], [40, 0])}px) scale(${pulse})`, letterSpacing: -2, marginBottom: 16, lineHeight: 1.1 }}>ConsultaParts AI</div>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 24, color: "hsla(0,0%,100%,0.6)", opacity: interpolate(s2, [0, 1], [0, 1]), transform: `translateY(${interpolate(s2, [0, 1], [20, 0])}px)`, marginBottom: 50 }}>Sistema Completo para Auto Peças</div>

        <div style={{ display: "flex", gap: 30, justifyContent: "center", marginBottom: 50 }}>
          {stats.map((st, i) => {
            const delay = i * 8 + 30;
            const sp = spring({ frame: frame - delay, fps, config: { damping: 18 } });
            return (
              <div key={i} style={{ opacity: interpolate(sp, [0, 1], [0, 1]), transform: `scale(${interpolate(sp, [0, 1], [0.6, 1])})` }}>
                <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: 44, fontWeight: 700, color: "hsl(38, 92%, 50%)" }}>{st.value}</div>
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: "hsla(0,0%,100%,0.5)", marginTop: 4 }}>{st.label}</div>
              </div>
            );
          })}
        </div>

        <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: 30, color: "hsl(38, 92%, 50%)", fontWeight: 700, opacity: interpolate(s4, [0, 1], [0, 1]), transform: `scale(${interpolate(s4, [0, 1], [0.8, 1])})`, letterSpacing: 2 }}>www.partsai.online</div>
      </div>
    </AbsoluteFill>
  );
};
