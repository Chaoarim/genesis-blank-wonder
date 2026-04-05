import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";

const features = [
  { icon: "🔄", title: "Garantia & Devoluções", desc: "Gestão de trocas com rastreio" },
  { icon: "📝", title: "Logs do Sistema", desc: "Auditoria completa de ações" },
  { icon: "📥", title: "Backup Excel", desc: "Exportação completa dos dados" },
  { icon: "📱", title: "Notificações WhatsApp", desc: "Alertas automáticos" },
  { icon: "❓", title: "Como Usar", desc: "Guia passo a passo" },
];

export const Scene7Ajuda = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const headerOp = interpolate(frame, [0, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ padding: "80px 50px", display: "flex", flexDirection: "column" }}>
      <div style={{ opacity: headerOp, marginBottom: 40 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ fontSize: 40, width: 56, height: 56, borderRadius: 14, background: "hsla(170, 70%, 45%, 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>❓</div>
          <div>
            <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: 13, color: "hsl(170, 70%, 50%)", fontWeight: 600, letterSpacing: 4, textTransform: "uppercase" }}>Módulo</div>
            <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: 40, fontWeight: 700, color: "white", letterSpacing: -1 }}>Suporte & Ajuda</div>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {features.map((f, i) => {
          const delay = i * 10 + 15;
          const s = spring({ frame: frame - delay, fps, config: { damping: 16, stiffness: 140 } });
          const op = interpolate(s, [0, 1], [0, 1]);
          const scale = interpolate(s, [0, 1], [0.8, 1]);
          return (
            <div key={i} style={{ background: "hsla(220, 20%, 12%, 0.9)", border: "1px solid hsla(170, 60%, 45%, 0.12)", borderRadius: 16, padding: "24px 22px", opacity: op, transform: `scale(${scale})`, display: "flex", alignItems: "center", gap: 18 }}>
              <div style={{ fontSize: 30, width: 54, height: 54, borderRadius: 14, background: "hsla(170, 50%, 45%, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{f.icon}</div>
              <div>
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: 22, color: "white", fontWeight: 600 }}>{f.title}</div>
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: 15, color: "hsla(0,0%,100%,0.45)", marginTop: 4 }}>{f.desc}</div>
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
