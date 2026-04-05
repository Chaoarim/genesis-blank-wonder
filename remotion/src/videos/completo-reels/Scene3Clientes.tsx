import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";

const features = [
  { icon: "👤", title: "Meus Clientes", desc: "Cadastro completo com CPF/CNPJ" },
  { icon: "💼", title: "Carteira", desc: "Clientes vinculados por vendedor" },
  { icon: "✅", title: "Aprovação de Crédito", desc: "Workflow com limite configurável" },
  { icon: "🔔", title: "Alertas de Recompra", desc: "Notificação automática" },
  { icon: "💰", title: "Rentabilidade", desc: "Lucro por cliente e período" },
  { icon: "💬", title: "Interações", desc: "Ligações, visitas, WhatsApp" },
];

export const Scene3Clientes = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const headerOp = interpolate(frame, [0, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ padding: "80px 50px" }}>
      <div style={{ opacity: headerOp, marginBottom: 30 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ fontSize: 40, width: 56, height: 56, borderRadius: 14, background: "hsla(200, 80%, 50%, 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>👥</div>
          <div>
            <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: 13, color: "hsl(200, 80%, 55%)", fontWeight: 600, letterSpacing: 4, textTransform: "uppercase" }}>Módulo</div>
            <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: 40, fontWeight: 700, color: "white", letterSpacing: -1 }}>Gestão de Clientes</div>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {features.map((f, i) => {
          const delay = i * 8 + 15;
          const s = spring({ frame: frame - delay, fps, config: { damping: 16, stiffness: 140 } });
          const scale = interpolate(s, [0, 1], [0.7, 1]);
          const op = interpolate(s, [0, 1], [0, 1]);
          return (
            <div key={i} style={{ background: "hsla(220, 20%, 12%, 0.9)", border: "1px solid hsla(200, 70%, 50%, 0.12)", borderRadius: 16, padding: "22px 20px", transform: `scale(${scale})`, opacity: op, display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ fontSize: 28, width: 50, height: 50, borderRadius: 14, background: "hsla(200, 60%, 50%, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{f.icon}</div>
              <div>
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: 20, color: "white", fontWeight: 600 }}>{f.title}</div>
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: "hsla(0,0%,100%,0.4)", marginTop: 3 }}>{f.desc}</div>
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
